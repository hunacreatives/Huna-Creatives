import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { GanttTimeline } from '@/pages/hub/components/GanttTimeline';
import Avatar from '@/pages/hub/components/Avatar';
import { supabase } from '@/lib/supabase';
import { createHubNotifications } from '@/lib/hubNotifications';
import { useHubAuth as useAuth } from '@/hooks/useHubAuth';
import { useDemo } from '@/contexts/DemoContext';
import { logAudit } from '@/lib/audit';
import { getSetting } from '@/lib/settings';
import { localToday, slugify, isTaskOverdue } from '@/lib/formatUtils';
import { DEMO_PROJECTS, DEMO_CONTRACTORS } from '@/lib/demoData';
import TaskDetailPanel, { type TaskDetailTask } from '@/pages/hub/components/TaskDetailPanel';
import { uploadFileToDrive } from '@/lib/driveUpload';
import { createTaskAttachment } from '@/lib/taskAttachments';
import { getTaskDescriptionPreview } from '@/pages/hub/utils/taskPreview';
import { getServicePalette } from '@/pages/hub/utils/servicePalette';
import { PRIORITY_CFG, PROJECT_STATUS_COLORS } from '@/pages/hub/utils/taskUi';
import { getDriveThumbnailUrl } from '@/pages/hub/utils/drive';
import { STAGES, DEFAULT_STAGE, getStageCfg } from '@/lib/projectStage';
import { fmt, fmtRate, fmtDate } from './shared';
import ReceiptLightbox from './ReceiptLightbox';
import QuestionnaireAnswersModal, { type WsQuestionnaireRow } from './QuestionnaireAnswersModal';
import SendReceiptModal from './SendReceiptModal';
import { openContractPreview } from './contractPreview';
import { openInvoicePrintView } from './invoicePrint';
import ProjectFormModal, { type ImportedTask } from './ProjectFormModal';
import { getPrimaryTaskAssigneeId, getTaskAssigneeIds, normalizeTaskAssigneePayload } from '@/lib/taskAssignments';
import type { HubClientContract } from '@/lib/types';



const serviceCfg: Record<string, { border: string; dot: string; badge: string }> = {
  'Website Design':           { border: 'border-l-sky-400',     dot: 'bg-sky-400',     badge: 'bg-sky-50 text-sky-700' },
  'Website Maintenance':      { border: 'border-l-cyan-400',    dot: 'bg-cyan-400',    badge: 'bg-cyan-50 text-cyan-700' },
  'Branding & Identity':      { border: 'border-l-violet-400',  dot: 'bg-violet-400',  badge: 'bg-violet-50 text-violet-700' },
  'Graphic Design':           { border: 'border-l-pink-400',    dot: 'bg-pink-400',    badge: 'bg-pink-50 text-pink-700' },
  'Social Media Management':  { border: 'border-l-orange-400',  dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-700' },
  'Content Creation':         { border: 'border-l-amber-400',   dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700' },
  'SEO':                      { border: 'border-l-emerald-400', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700' },
  'Digital Ads':              { border: 'border-l-rose-400',    dot: 'bg-rose-400',    badge: 'bg-rose-50 text-rose-700' },
  'Email Marketing':          { border: 'border-l-indigo-400',  dot: 'bg-indigo-400',  badge: 'bg-indigo-50 text-indigo-700' },
  'Other':                    { border: 'border-l-gray-300',    dot: 'bg-gray-300',    badge: 'bg-gray-50 text-gray-500' },
};
const getServiceCfg = (service: string | null) => serviceCfg[service ?? ''] ?? serviceCfg['Other'];

const statusCfg: Record<string, { label: string; cls: string }> = {
  ongoing:   { label: 'Ongoing',   cls: 'bg-sky-100 text-sky-700' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  paused:    { label: 'Paused',    cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
};

interface ContractorPayout { id: number; amount: number; paid_at: string; notes: string | null; receipt_url: string | null; }
interface PaymentReminder { id: number; send_date: string; amount_due: number | null; notes: string | null; status: string; sent_at: string | null; }
type InvoiceSendMode = 'now' | 'schedule';

interface Project {
  id: number; client_name: string; project_name: string; service: string | null;
  project_type: 'client' | 'internal' | 'retainer';
  contract_price: number; monthly_rate: number | null; status: string; stage?: string | null; start_date: string | null; deadline: string | null; notes: string | null; contact_email: string | null;
  monthly_deliverables?: number | null;
  client_status_token?: string | null;
  archived_at?: string | null;
  hub_project_payments: { id: number; amount: number; paid_at: string; notes: string | null; receipt_url: string | null }[];
  hub_project_costs: { id: number; label: string; amount: number; date: string }[];
  hub_payment_reminders: PaymentReminder[];
  hub_project_contractors: {
    id: number; percentage: number; payout_type: string; fixed_amount: number | null;
    payout_status: string; paid_at: string | null; notes: string | null;
    project_role?: string | null;
    exclude_from_payout: boolean;
    hub_users: { id: string; full_name: string; avatar_url: string | null; email: string | null };
    hub_project_contractor_payouts: ContractorPayout[];
  }[];
}

interface Contractor { id: string; full_name: string; avatar_url: string | null; project_percentage: number | null; department: string | null; }

interface ProjectTask {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  assignee_ids?: string[] | null;
  due_date: string | null;
  start_date: string | null;
  created_at: string;
  hub_users?: { id: string; full_name: string; avatar_url: string | null } | null;
  meta?: { custom_fields?: {id: string; label: string; value: string}[]; blocked_reason?: string | null } | null;
  archived?: boolean | null;
  archived_at?: string | null;
  sort_order?: number | null;
  completed_at?: string | null;
  deleted_at?: string | null;
}

interface ProjectActivity {
  id: number;
  project_id: number;
  actor_name?: string;
  user_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: number | null;
  entity_title?: string | null;
  description?: string;
  meta?: Record<string, unknown> | null;
  created_at: string;
  hub_users?: { id: string; full_name: string; avatar_url: string | null } | null;
}


function normalizeTaskActivityDescription(row: { actor_name: string; type: string; description: string; task_title?: string | null }) {
  const title = row.task_title ? `"${row.task_title}"` : 'this task';
  switch (row.type) {
    case 'created':
      return `${row.actor_name} created ${title}`;
    case 'status_change':
      return `${row.actor_name} ${row.description} on ${title}`;
    case 'assigned':
      return `${row.actor_name} ${row.description} on ${title}`;
    case 'comment_added':
      return `${row.actor_name} commented on ${title}`;
    case 'attachment_added':
      return `${row.actor_name} ${row.description} on ${title}`;
    default:
      return `${row.actor_name} ${row.description} on ${title}`;
  }
}

function getProjectActivityActorName(activity: ProjectActivity) {
  return activity.actor_name ?? activity.hub_users?.full_name ?? 'Someone';
}

function getProjectActivityDescription(activity: ProjectActivity) {
  if (activity.description) return activity.description;
  const actor = getProjectActivityActorName(activity);
  // 'custom' rows (from logActivity) store the full, already-complete message
  // (actor name included by the caller) in meta.message — the switch below
  // never had a case for it, so it fell through to the generic default and
  // fabricated "<actor> custom this item" instead of showing what was
  // actually logged. 'custom' is an internal sentinel value and must never
  // reach the screen literally, even if meta.message is somehow missing.
  if (activity.action === 'custom') {
    if (activity.meta?.message) return String(activity.meta.message);
    return `${actor} made an update`;
  }
  const title = activity.entity_title ? `"${activity.entity_title}"` : 'this item';
  switch (activity.action) {
    case 'task_created':
      return `${actor} created ${title}`;
    case 'task_status_changed':
      if (activity.meta?.to) {
        return `${actor} moved ${title} to ${String(activity.meta.to).replace(/_/g, ' ')}`;
      }
      return `${actor} updated ${title}`;
    case 'task_assigned':
      return `${actor} assigned ${title}`;
    case 'comment_added':
      return `${actor} commented on ${title}`;
    case 'attachment_added':
      return `${actor} added an attachment to ${title}`;
    case 'task_deleted':
      return `${actor} deleted ${title}`;
    default:
      return activity.action ? `${actor} ${activity.action.replace(/_/g, ' ')} ${title}` : `${actor} updated ${title}`;
  }
}


export default function AdminProjectsPage() {
  const { hubUser } = useAuth();
  const { isDemo } = useDemo();
  const navigate = useNavigate();
  const isOwner = hubUser?.role === 'owner' || isDemo;
  const [usdRate, setUsdRate] = useState(56);
  useEffect(() => { getSetting('usd_rate', '56').then(v => setUsdRate(parseFloat(v))); }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliveredThisMonth, setDeliveredThisMonth] = useState<Record<number, number>>({});
  const [myTasks, setMyTasks] = useState<{ id: number; title: string; status: string; priority: string; due_date: string | null; project_id: number; project_name: string; client_name: string }[]>([]);
  const [myTaskCompleting, setMyTaskCompleting] = useState<number | null>(null);
  const [intlClients, setIntlClients] = useState<{ id: number; client_name: string; platform: string | null; status: string; notes: string | null; contract_value: number | null; contract_currency: string | null; assignments: { id: number; contractor_id: string; role: string | null; hub_users: { id: string; full_name: string; avatar_url: string | null; department: string | null } | null }[] }[]>([]);
  const [activeClientId, setActiveClientId] = useState<number | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'paused' | 'completed' | 'archived'>('ongoing');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [pageView, setPageView] = useState<'projects' | 'tasks' | 'team'>('projects');
  const [teamWindow, setTeamWindow] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  // Quick-add-task mini-form on a Team tab card
  const [quickAddFor, setQuickAddFor] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddDueDate, setQuickAddDueDate] = useState('');
  const [quickAddProjectId, setQuickAddProjectId] = useState<number | null>(null);
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [allTasksLoading, setAllTasksLoading] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState('active');
  const [taskGroupBy, setTaskGroupBy] = useState<'project' | 'assignee'>('project');
  const [taskSearch, setTaskSearch] = useState('');
  const [projectTypeFilter, setProjectTypeFilter] = useState<'all' | 'client' | 'internal' | 'retainer'>('all');
  const [activeId, setActiveId] = useState<number | null>(() => {
    const w = searchParams.get('w');
    return w ? parseInt(w) : null;
  });
  const [linkCopied, setLinkCopied] = useState(false);
  const [clientLinkCopied, setClientLinkCopied] = useState(false);

  // Project form
  const emptyForm = { project_type: 'client' as 'client' | 'internal' | 'retainer', client_name: '', project_name: '', service: 'Website Design', contract_price: '', monthly_rate: '', monthly_rate_currency: 'PHP' as 'PHP' | 'USD', monthly_deliverables: '', status: 'ongoing', stage: DEFAULT_STAGE as string, start_date: '', deadline: '', notes: '', contact_email: '', drive_url: '' };
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [importedTasks, setImportedTasks] = useState<ImportedTask[]>([]);

  // Payment log
  const [payAmount, setPayAmount] = useState('');
  const [payCurrency, setPayCurrency] = useState<'PHP' | 'USD'>('PHP');
  const [payDate, setPayDate] = useState(localToday());
  const [payNotes, setPayNotes] = useState('');
  const [payReceipt, setPayReceipt] = useState<File | null>(null);
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  // Payment edit
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editPayForm, setEditPayForm] = useState({ amount: '', date: '', notes: '', receipt: null as File | null, existingReceiptUrl: null as string | null });
  const [editPaySaving, setEditPaySaving] = useState(false);
  const [editPayError, setEditPayError] = useState('');

  // Cost log
  const [costLabel, setCostLabel] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costDate, setCostDate] = useState(localToday());
  const [costSaving, setCostSaving] = useState(false);
  const [costError, setCostError] = useState('');

  // Send receipt
  const [sendReceiptModal, setSendReceiptModal] = useState<{ payment: Project['hub_project_payments'][0]; project: Project } | null>(null);

  // Employee assignment
  const [addCtxId, setAddCtxId] = useState('');
  const [addCtxRole, setAddCtxRole] = useState('');
  const [ctxSaving, setCtxSaving] = useState(false);
  const [ctxAddError, setCtxAddError] = useState('');
  const [ctxConfigSaving, setCtxConfigSaving] = useState<Record<number, boolean>>({});
  const [ctxConfigError, setCtxConfigError] = useState<Record<number, string>>({});
  const [ctxConfigForm, setCtxConfigForm] = useState<Record<number, { payoutType: 'percentage' | 'fixed'; percentage: string; fixedAmount: string }>>({});

  // Staged contractor payouts: keyed by hub_project_contractors.id
  const [ctxPayForm, setCtxPayForm] = useState<Record<number, { amount: string; date: string; notes: string; receipt: File | null; notify: boolean }>>({});
  const [ctxPaySaving, setCtxPaySaving] = useState<Record<number, boolean>>({});
  const [ctxPayError, setCtxPayError] = useState<Record<number, string>>({});
  // Kept apart from ctxPayError: the payout IS recorded, but a follow-on step
  // (so far, the notification email) failed. Showing it as an error would read
  // as "the payment did not save", which is the opposite of what happened.
  const [ctxPayWarn, setCtxPayWarn] = useState<Record<number, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);


  // Tasks
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<number,number>>({});
  const [taskFilter, setTaskFilter] = useState<'all' | 'mine' | 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done' | 'overdue'>('all');
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
  const [showTrashedTasks, setShowTrashedTasks] = useState(false);
  const restoreTask = async (taskId: number) => {
    const { error } = await supabase.from('hub_project_tasks').update({ deleted_at: null, updated_at: new Date().toISOString() }).eq('id', taskId);
    if (error) { window.alert(`Failed to restore task: ${error.message}`); return; }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, deleted_at: null } : t));
  };
  const [taskView, setTaskView] = useState<'list' | 'board'>('list');
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [boardDragOver, setBoardDragOver] = useState<ProjectTask['status'] | null>(null);
  const [listDragOverTaskId, setListDragOverTaskId] = useState<number | null>(null);
  const [listDragOverPos, setListDragOverPos] = useState<'above' | 'below' | null>(null);
  const listDragFromHandle = useRef(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssigneeIds, setNewTaskAssigneeIds] = useState<string[]>([]);
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskAttachment, setNewTaskAttachment] = useState<File | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const newTaskAttachmentRef = useRef<HTMLInputElement>(null);

  // Task detail panel
  const [detailTask, setDetailTask] = useState<TaskDetailTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newTaskDefaultDueDate, setNewTaskDefaultDueDate] = useState<string | undefined>(undefined);
  const openTaskDetail = (task: ProjectTask) => { setDetailTask(task as TaskDetailTask); setDetailOpen(true); };
  const openNewTask = () => { setDetailTask(null); setNewTaskDefaultDueDate(undefined); setDetailOpen(true); };
  const openNewTaskForDate = (date: string) => { setDetailTask(null); setNewTaskDefaultDueDate(date); setDetailOpen(true); };

  // Activity
  const [activity, setActivity] = useState<ProjectActivity[]>([]);

  // Workspace questionnaires
  const [wsQuestionnaires, setWsQuestionnaires] = useState<WsQuestionnaireRow[]>([]);
  const [wsQModal, setWsQModal] = useState<WsQuestionnaireRow | null>(null);

  // Workspace overlay
  // ?ws=1 must be honored from the very first render — the URL-sync effect
  // below runs on mount and rewrites the query string, which would strip it
  // before projects load (breaking notification deep links).
  const [workspaceOpen, setWorkspaceOpen] = useState(() => !!activeId && searchParams.get('ws') === '1');
  // Opening a project on mobile otherwise keeps whatever scroll position the
  // project list was at, landing mid-page instead of at the workspace top.
  useEffect(() => {
    if (workspaceOpen) {
      document.getElementById('ws-scroll')?.scrollTo({ top: 0 });
      document.querySelector('main')?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    }
  }, [workspaceOpen, activeId]);
  const openWorkspaceOnLoad = useRef(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  // Collapsible detail sections (all closed by default)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  // Collapsed task groups in workspace
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setOpenSections(s => ({ ...s, [key]: !s[key] }));
  const teamPayoutsOpen = !!openSections['team'];

  // Client checklist — proposals (no project_id FK, so we match by client name)
  const [clientProposals, setClientProposals] = useState<{ slug: string; status: string; project_title?: string | null }[]>([]);

  // Client contracts
  const [contracts, setContracts] = useState<HubClientContract[]>([]);
  const [contractsLoaded, setContractsLoaded] = useState<number | null>(null);
  const [contractPrompt, setContractPrompt] = useState('');
  const [contractGenerating, setContractGenerating] = useState(false);
  const [contractGenError, setContractGenError] = useState('');
  const [contractPreview, setContractPreview] = useState<{ title: string; body: string } | null>(null);
  const [contractSaving, setContractSaving] = useState(false);
  const [contractSendSlug, setContractSendSlug] = useState<string | null>(null);

  const loadContracts = async (projectId: number) => {
    const { data } = await supabase
      .from('hub_client_contracts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setContracts((data ?? []) as HubClientContract[]);
    setContractsLoaded(projectId);
  };

  const generateContract = async () => {
    if (!contractPrompt.trim() || !activeProject) return;
    setContractGenerating(true);
    setContractGenError('');
    setContractPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-client-contract', {
        body: {
          description: contractPrompt,
          project_name: activeProject.project_name,
          client_name: activeProject.client_name,
          contact_email: activeProject.contact_email ?? '',
          total_value: activeProject.contract_price || activeProject.monthly_rate,
          currency: (activeProject as any).currency || 'PHP',
          service: activeProject.service ?? '',
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setContractPreview(data as { title: string; body: string });
    } catch (e: any) {
      setContractGenError(e.message ?? 'Generation failed.');
    } finally {
      setContractGenerating(false);
    }
  };

  const saveContract = async (sendNow = false) => {
    if (!contractPreview || !activeProject) return;
    setContractSaving(true);
    setContractGenError('');
    try {
      const baseSlug = slugify(`${activeProject.client_name}-${activeProject.project_name}`);
      const slug = `${baseSlug}-${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from('hub_client_contracts')
        .insert({
          project_id: activeProject.id,
          slug,
          title: contractPreview.title,
          body: contractPreview.body,
          total_value: activeProject.contract_price || activeProject.monthly_rate || null,
          currency: (activeProject as any).currency || 'PHP',
          status: sendNow ? 'sent' : 'draft',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      setContracts(prev => [data as HubClientContract, ...prev]);
      setContractPreview(null);
      setContractPrompt('');
      if (sendNow) {
        setContractSendSlug(slug);
        const clientEmail = (activeProject as any).contact_email;
        if (clientEmail) {
          supabase.functions.invoke('send-client-contract', {
            body: {
              slug,
              client_email: clientEmail,
              client_name: activeProject.client_name,
              contract_title: contractPreview.title,
              project_name: activeProject.project_name,
            },
          }).catch(console.error);
        }
      }
    } catch (e: any) {
      setContractGenError(e.message ?? 'Save failed.');
    } finally {
      setContractSaving(false);
    }
  };

  const toggleChecklist = async (key: string, autoState: boolean) => {
    if (!activeProject) return;
    const current: Record<string, boolean> = (activeProject as any).client_checklist ?? {};
    const effective = key in current ? current[key] : autoState;
    const updated = { ...current, [key]: !effective };
    await supabase.from('hub_projects').update({ client_checklist: updated }).eq('id', activeProject.id);
    setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, client_checklist: updated } as any : p));
  };

  const markContractSent = async (contractId: string, slug: string) => {
    const { error } = await supabase
      .from('hub_client_contracts')
      .update({ status: 'sent' })
      .eq('id', contractId);
    if (!error) {
      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: 'sent' } : c));
      setContractSendSlug(slug);
      const clientEmail = (activeProject as any)?.contact_email;
      const contract = contracts.find(c => c.id === contractId);
      if (clientEmail && contract) {
        supabase.functions.invoke('send-client-contract', {
          body: {
            slug,
            client_email: clientEmail,
            client_name: activeProject?.client_name,
            contract_title: contract.title,
            project_name: activeProject?.project_name,
          },
        }).catch(console.error);
      }
    }
  };


  // Payment reminders
  const [reminderDate, setReminderDate] = useState('');
  const [reminderAmount, setReminderAmount] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState('');

  const fetchTasks = async (projectId: number) => {
    const [tRes, aRes] = await Promise.all([
      supabase.from('hub_project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true }),
      supabase.from('hub_project_activity')
        .select('*, hub_users(full_name, avatar_url)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    setTasks((tRes.data as ProjectTask[]) ?? []);
    const taskRows = (tRes.data as ProjectTask[]) ?? [];
    // Fetch comment counts for all tasks
    if (taskRows.length) {
      const ids = taskRows.map(t => t.id);
      supabase.from('hub_project_task_comments').select('task_id').in('task_id', ids)
        .then(({ data }) => {
          const counts: Record<number,number> = {};
          for (const r of data ?? []) counts[r.task_id] = (counts[r.task_id] ?? 0) + 1;
          setCommentCounts(counts);
        });
      const { data: taskActivityRows } = await supabase
        .from('hub_project_task_activity')
        .select('id, task_id, actor_name, type, description, created_at')
        .in('task_id', ids)
        .order('created_at', { ascending: false })
        .limit(20);
      const taskTitleMap = Object.fromEntries(taskRows.map((task) => [task.id, task.title]));
      const mergedActivity = [
        ...((aRes.data as ProjectActivity[]) ?? []),
        ...((taskActivityRows ?? []).map((row: any) => ({
          id: 9_000_000_000 + row.id, // offset avoids key collisions with project-activity ids
          project_id: projectId,
          actor_name: row.actor_name,
          description: normalizeTaskActivityDescription({
            actor_name: row.actor_name,
            type: row.type,
            description: row.description,
            task_title: taskTitleMap[row.task_id] ?? null,
          }),
          created_at: row.created_at,
        })) as ProjectActivity[]),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20);
      setActivity(mergedActivity);
      return;
    }
    setActivity((aRes.data as ProjectActivity[]) ?? []);
  };

  const refreshWorkspaceActivity = useCallback(async () => {
    if (!activeId) {
      setActivity([]);
      return;
    }

    const projectTaskIds = tasks
      .filter((task) => task.project_id === activeId)
      .map((task) => task.id);

    const { data: projectActivityRows } = await supabase
      .from('hub_project_activity')
      .select('*, hub_users(full_name, avatar_url)')
      .eq('project_id', activeId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!projectTaskIds.length) {
      setActivity((projectActivityRows as ProjectActivity[]) ?? []);
      return;
    }

    const taskTitleMap = Object.fromEntries(
      tasks
        .filter((task) => task.project_id === activeId)
        .map((task) => [task.id, task.title])
    );

    const { data: taskActivityRows } = await supabase
      .from('hub_project_task_activity')
      .select('id, task_id, actor_name, type, description, created_at')
      .in('task_id', projectTaskIds)
      .order('created_at', { ascending: false })
      .limit(20);

    const mergedActivity = [
      ...((projectActivityRows as ProjectActivity[]) ?? []),
      ...((taskActivityRows ?? []).map((row: any) => ({
        id: 9_000_000_000 + row.id, // offset avoids key collisions with project-activity ids
        project_id: activeId,
        actor_name: row.actor_name,
        description: normalizeTaskActivityDescription({
          actor_name: row.actor_name,
          type: row.type,
          description: row.description,
          task_title: taskTitleMap[row.task_id] ?? null,
        }),
        created_at: row.created_at,
      })) as ProjectActivity[]),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);

    setActivity(mergedActivity);
  }, [activeId, tasks]);

  const logActivity = async (projectId: number, description: string) => {
    if (isDemo) return;

    const newPayload = {
      project_id: projectId,
      user_id: hubUser?.id ?? null,
      action: 'custom',
      entity_type: 'project',
      entity_id: null,
      entity_title: null,
      meta: { message: description },
    };

    const { error } = await supabase.from('hub_project_activity').insert(newPayload);
    if (error) {
      await supabase.from('hub_project_activity').insert({
        project_id: projectId,
        actor_id: hubUser?.id ?? null,
        actor_name: hubUser?.full_name ?? 'Admin',
        description,
      });
    }
  };

  const createTask = async () => {
    if (!activeId || !newTaskTitle.trim()) return;
    setTaskSaving(true);
    try {
      const taskAssigneePayload = normalizeTaskAssigneePayload(newTaskAssigneeIds);
      const { data, error } = await supabase.from('hub_project_tasks').insert({
        project_id: activeId,
        title: newTaskTitle.trim(),
        status: 'todo',
        priority: newTaskPriority,
        ...taskAssigneePayload,
        due_date: newTaskDue || null,
      }).select('*').single();
      if (error || !data) return;
      if (newTaskAttachment && hubUser?.id) {
        setUploadingAttachment(true);
        try {
          await createTaskAttachment({
            taskId: data.id,
            file: newTaskAttachment,
            uploadedBy: hubUser.id,
            projectName: activeProject?.project_name ?? 'General',
          });
        } finally {
          setUploadingAttachment(false);
        }
      }
      const assigneeUser = taskAssigneePayload.assigned_to
        ? activeProject?.hub_project_contractors.find(pc => pc.hub_users?.id === taskAssigneePayload.assigned_to)?.hub_users ?? null
        : null;
      setTasks(prev => [...prev, { ...data, hub_users: assigneeUser } as ProjectTask]);
      const assigneeNames = newTaskAssigneeIds
        .map((assigneeId) => activeProject?.hub_project_contractors.find((pc) => pc.hub_users?.id === assigneeId)?.hub_users?.full_name ?? '')
        .filter(Boolean);
      await logActivity(activeId, `${hubUser?.full_name ?? 'Admin'} created task "${newTaskTitle.trim()}"${assigneeNames.length ? ` — assigned to ${assigneeNames.join(', ')}` : ''}`);
      if (newTaskAssigneeIds.length > 0 && data) {
        supabase.functions.invoke('notify-task-assigned', {
          body: {
            task_id: data.id,
            task_title: newTaskTitle.trim(),
            project_id: activeId,
            project_name: activeProject?.project_name ?? '',
            assigned_to_ids: newTaskAssigneeIds,
            assigned_by_name: hubUser?.full_name ?? 'Admin',
          },
        }).catch(console.error);
      }
      setNewTaskTitle(''); setNewTaskAssigneeIds([]); setNewTaskDue(''); setNewTaskPriority('medium'); setNewTaskAttachment(null); setShowTaskForm(false);
      if (newTaskAttachmentRef.current) newTaskAttachmentRef.current.value = '';
      fetchTasks(activeId);
    } catch (err) {
      console.error('Task create error:', err);
    } finally {
      setTaskSaving(false);
    }
  };

  const updateTaskStatus = async (task: ProjectTask, newStatus: ProjectTask['status']) => {
    if (task.status === newStatus || isDemo) return;
    // Blocked needs a reason so the team can see what's stuck; leaving blocked clears it
    const currentMeta = task.meta ?? null;
    let metaPatch: Record<string, unknown> = {};
    if (newStatus === 'blocked') {
      const reason = window.prompt("What's blocking this task? (visible to the team)", (currentMeta as any)?.blocked_reason ?? '');
      if (reason === null) return;
      metaPatch = { meta: { ...(currentMeta ?? {}), blocked_reason: reason.trim() } };
    } else if (task.status === 'blocked' && (currentMeta as any)?.blocked_reason) {
      const { blocked_reason: _drop, ...rest } = currentMeta as any;
      metaPatch = { meta: Object.keys(rest).length ? rest : null };
    }
    await supabase.from('hub_project_tasks').update({ status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null, updated_at: new Date().toISOString(), ...metaPatch }).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, ...(metaPatch as any) } : t));
    const statusLabel = newStatus.replace('_', ' ');
    await logActivity(task.project_id, `${hubUser?.full_name ?? 'Admin'} moved "${task.title}" to ${statusLabel}`);
    if (newStatus === 'done') fetchTasks(task.project_id);
    const updaterName = hubUser?.full_name ?? 'Admin';
    supabase.functions.invoke('notify-task-updated', {
      body: {
        task_id: task.id,
        project_id: task.project_id,
        task_title: task.title,
        project_name: projects.find(p => p.id === task.project_id)?.project_name ?? 'General',
        updated_by_id: hubUser?.id,
        updated_by_name: updaterName,
        change_description: `${updaterName} marked "${task.title}" as ${statusLabel}`,
      },
    }).catch(console.error);
  };

  const toggleTask = async (task: ProjectTask) => {
    const next = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done';
    await updateTaskStatus(task, next);
  };

  // Activity + notification for status changes made outside the active workspace
  // (My Tasks panel, All Tasks view) — keeps every status path traceable.
  const logStatusChangeSideEffects = (task: { id: number; project_id: number; title: string }, newStatus: string) => {
    if (isDemo) return;
    const statusLabel = newStatus.replace('_', ' ');
    const updaterName = hubUser?.full_name ?? 'Admin';
    logActivity(task.project_id, `${updaterName} moved "${task.title}" to ${statusLabel}`);
    supabase.functions.invoke('notify-task-updated', {
      body: {
        task_id: task.id,
        project_id: task.project_id,
        task_title: task.title,
        project_name: projects.find(p => p.id === task.project_id)?.project_name ?? 'General',
        updated_by_id: hubUser?.id,
        updated_by_name: updaterName,
        change_description: `${updaterName} marked "${task.title}" as ${statusLabel}`,
      },
    }).catch(console.error);
  };

  const reorderTasks = async (orderedIds: number[]) => {
    const orderedSet = new Set(orderedIds);
    // Sort all current tasks by their existing sort_order / created_at
    const currentSorted = [...tasks].sort((a, b) => {
      if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
      if (a.sort_order != null) return -1;
      if (b.sort_order != null) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    // Non-group tasks keep their relative order; find where the group sits
    const nonGroup = currentSorted.filter(t => !orderedSet.has(t.id));
    const firstGroupOriginalIdx = currentSorted.findIndex(t => orderedSet.has(t.id));
    let insertAt = 0;
    for (const t of currentSorted.slice(0, firstGroupOriginalIdx)) {
      if (!orderedSet.has(t.id)) insertAt++;
    }
    const groupTasks = orderedIds.map(id => tasks.find(t => t.id === id)!).filter(Boolean);
    const fullOrder = [...nonGroup.slice(0, insertAt), ...groupTasks, ...nonGroup.slice(insertAt)];
    const newTasks = fullOrder.map((t, i) => ({ ...t, sort_order: i + 1 }));
    setTasks(newTasks);
    await Promise.all(newTasks.map(t =>
      supabase.from('hub_project_tasks').update({ sort_order: t.sort_order }).eq('id', t.id)
    ));
  };

  const fetchAllTasks = async () => {
    setAllTasksLoading(true);
    const [tasksRes, projectsRes] = await Promise.all([
      supabase.from('hub_project_tasks').select('id, project_id, title, status, priority, assigned_to, assignee_ids, due_date, completed_at, archived').is('deleted_at', null).order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('hub_projects').select('id, project_name, client_name, project_type'),
    ]);
    const projectMap: Record<number, any> = Object.fromEntries((projectsRes.data ?? []).map((p: any) => [p.id, p]));
    const userIds = [...new Set((tasksRes.data ?? []).flatMap((t: any) => getTaskAssigneeIds(t)).filter(Boolean))];
    const usersRes = userIds.length ? await supabase.from('hub_users').select('id, full_name, avatar_url').in('id', userIds) : { data: [] };
    const userMap: Record<string, any> = Object.fromEntries((usersRes.data ?? []).map((u: any) => [u.id, u]));
    setAllTasks((tasksRes.data ?? []).map((t: any) => ({
      ...t,
      project: projectMap[t.project_id] ?? null,
      assignee: getPrimaryTaskAssigneeId(t) ? userMap[getPrimaryTaskAssigneeId(t)!] ?? null : null,
      assignees: getTaskAssigneeIds(t).map((id) => userMap[id]).filter(Boolean),
    })));
    setAllTasksLoading(false);
  };

  // Quick-add a task to a contractor from a Team tab card.
  const quickAddTask = async (contractorId: string) => {
    if (!quickAddTitle.trim() || !quickAddProjectId || quickAddSaving) return;
    setQuickAddSaving(true);
    try {
      const taskAssigneePayload = normalizeTaskAssigneePayload([contractorId]);
      const { data, error } = await supabase.from('hub_project_tasks').insert({
        project_id: quickAddProjectId,
        title: quickAddTitle.trim(),
        status: 'todo',
        priority: 'medium',
        ...taskAssigneePayload,
        due_date: quickAddDueDate || null,
      }).select('id, project_id, title, status, priority, assigned_to, assignee_ids, due_date, completed_at, archived').single();
      if (error || !data) return;
      const project = projects.find(p => p.id === data.project_id);
      const assignee = contractors.find(c => c.id === contractorId) ?? null;
      setAllTasks(prev => [...prev, {
        ...data,
        project: project ? { id: project.id, project_name: project.project_name, client_name: (project as any).client_name, project_type: project.project_type } : null,
        assignee,
        assignees: assignee ? [assignee] : [],
      }]);
      setQuickAddFor(null);
      setQuickAddTitle('');
      setQuickAddDueDate('');
    } finally {
      setQuickAddSaving(false);
    }
  };

  const fetchAll = async () => {
    // Auto-archive: completed projects untouched for 30 days move to the
    // Archived tab (never deleted — their workspaces stay openable).
    const archiveCutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    await supabase.from('hub_projects')
      .update({ archived_at: new Date().toISOString() })
      .eq('status', 'completed')
      .is('archived_at', null)
      .lt('updated_at', archiveCutoff)
      .then(({ error }) => { if (error) console.error('Auto-archive failed:', error); });

    const [pRes, cRes, clientRes] = await Promise.all([
      supabase.from('hub_projects')
        .select('*, hub_project_payments(id, amount, paid_at, notes, receipt_url), hub_project_costs(id, label, amount, date), hub_payment_reminders(id, send_date, amount_due, notes, status, sent_at), hub_project_contractors(id, percentage, payout_type, fixed_amount, payout_status, paid_at, notes, exclude_from_payout, hub_users(id, full_name, avatar_url, email), hub_project_contractor_payouts(id, amount, paid_at, notes, receipt_url))')
        .order('created_at', { ascending: false }),
      supabase.from('hub_users').select('id, full_name, avatar_url, project_percentage, department')
        .eq('status', 'active').order('full_name'),
      supabase.from('hub_clients').select('id, client_name, platform, status, notes, contract_value, contract_currency, hub_client_assignments(id, contractor_id, role, hub_users(id, full_name, avatar_url, department))').order('client_name'),
    ]);
    setProjects((pRes.data as Project[]) ?? []);

    // Monthly deliverables: count tasks completed this month per quota'd retainer
    const quotaProjectIds = ((pRes.data as Project[]) ?? [])
      .filter(p => p.project_type === 'retainer' && (p.monthly_deliverables ?? 0) > 0)
      .map(p => p.id);
    if (quotaProjectIds.length > 0) {
      const monthStart = new Date();
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const { data: doneRows } = await supabase
        .from('hub_project_tasks')
        .select('project_id')
        .eq('status', 'done')
        .gte('completed_at', monthStart.toISOString())
        .in('project_id', quotaProjectIds);
      const counts: Record<number, number> = {};
      for (const r of (doneRows ?? []) as { project_id: number }[]) counts[r.project_id] = (counts[r.project_id] ?? 0) + 1;
      setDeliveredThisMonth(counts);
    } else {
      setDeliveredThisMonth({});
    }

    if (hubUser?.id) {
      const uid = hubUser.id;
      const { data: mtData } = await supabase
        .from('hub_project_tasks')
        .select('id, title, status, priority, due_date, project_id, hub_projects(project_name, client_name)')
        .or(`assigned_to.eq.${uid},assignee_ids.cs.{${uid}}`)
        .neq('status', 'done')
        .not('archived', 'is', true)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });
      setMyTasks((mtData ?? []).map((t: any) => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority, due_date: t.due_date,
        project_id: t.project_id,
        project_name: t.hub_projects?.project_name ?? 'Unknown',
        client_name: t.hub_projects?.client_name ?? '',
      })));
    }
    // Purge tasks that have been in the trash for over 30 days
    const purgeCutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    supabase.from('hub_project_tasks').delete().lt('deleted_at', purgeCutoff)
      .then(({ error }) => { if (error) console.error('Trash purge failed:', error); });

    setContractors((cRes.data as Contractor[]) ?? []);
    setIntlClients((clientRes.data ?? []).map((c: any) => ({
      id: c.id, client_name: c.client_name, platform: c.platform, status: c.status,
      notes: c.notes, contract_value: c.contract_value, contract_currency: c.contract_currency,
      assignments: (Array.isArray(c.hub_client_assignments) ? c.hub_client_assignments : []).map((a: any) => ({
        id: a.id, contractor_id: a.contractor_id, role: a.role,
        hub_users: Array.isArray(a.hub_users) ? a.hub_users[0] : a.hub_users,
      })),
    })));
    setLoading(false);
  };

  useEffect(() => {
    if (isDemo) {
      setProjects(DEMO_PROJECTS as unknown as Project[]);
      setContractors(DEMO_CONTRACTORS.map(c => ({ id: c.id, full_name: c.full_name, avatar_url: null, project_percentage: null, department: c.department || null })));
      setLoading(false);
      return;
    }
    fetchAll();
    fetchAllTasks();
  }, [isDemo]);

  const activeProject = projects.find(p => p.id === activeId) ?? null;

  const isRetainerProject = (project: Project | null | undefined) => project?.project_type === 'retainer';

  // License clients (Sentro Hub instances) have no tasks/team — just billing + contract.
  const isLicenseProject = (project: Project | null | undefined) => project?.service === 'Sentro Hub License';

  const derived = (p: Project) => {
    const totalPaid = p.hub_project_payments.reduce((s, x) => s + x.amount, 0);
    const totalCosts = p.hub_project_costs.reduce((s, x) => s + x.amount, 0);
    const netProfit = (p.project_type === 'retainer' ? totalPaid : p.contract_price) - totalCosts;
    const balance = p.project_type === 'retainer' ? 0 : p.contract_price - totalPaid;
    const paidPct = p.project_type === 'retainer' ? 100 : (p.contract_price > 0 ? (totalPaid / p.contract_price) * 100 : 0);
    const monthsActive = p.start_date ? Math.max(1, Math.ceil((Date.now() - new Date(p.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30.5))) : null;
    const monthlyRatePHP = p.monthly_rate
      ? ((p as any).monthly_rate_currency === 'USD' ? p.monthly_rate * usdRate : p.monthly_rate)
      : 0;
    const monthsCollected = monthlyRatePHP > 0 ? Math.round(totalPaid / monthlyRatePHP) : null;
    return { totalPaid, totalCosts, netProfit, balance, paidPct, monthsActive, monthsCollected };
  };

  const isInternalProject = (project: Project | null | undefined) => project?.project_type === 'internal';

  const saveProject = async () => {
    const isInternal = form.project_type === 'internal';
    const isRetainer = form.project_type === 'retainer';
    if (!form.project_name.trim()) { setFormError('Project name is required.'); return; }
    if (!isInternal && !form.client_name.trim()) { setFormError('Client name is required.'); return; }
    if (!isRetainer && !isInternal && !form.contract_price) { setFormError('Contract price is required.'); return; }
    if (isRetainer && !form.monthly_rate) { setFormError('Monthly rate is required for retainer projects.'); return; }
    setFormSaving(true); setFormError('');
    const payload = {
      project_type: form.project_type,
      client_name: isInternal ? (form.client_name.trim() || 'Internal') : form.client_name.trim(),
      project_name: form.project_name.trim(),
      service: form.service || null,
      contract_price: isInternal ? 0 : (isRetainer ? (parseFloat(form.contract_price) || 0) : parseFloat(form.contract_price)),
      monthly_rate: isRetainer ? parseFloat((form as any).monthly_rate) : null,
      monthly_rate_currency: isRetainer ? (form as any).monthly_rate_currency : 'PHP',
      monthly_deliverables: isRetainer && (form as any).monthly_deliverables ? parseInt((form as any).monthly_deliverables, 10) : null,
      status: form.status,
      stage: form.stage || DEFAULT_STAGE,
      start_date: form.start_date || null,
      deadline: isRetainer ? null : (form.deadline || null),
      notes: form.notes || null,
      contact_email: isInternal ? null : (form.contact_email.trim() || null),
      drive_url: (form as any).drive_url?.trim() || null,
    };
    if (editingProject) {
      const { error } = await supabase.from('hub_projects').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingProject.id);
      if (error) { setFormError(error.message); setFormSaving(false); return; }
      logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'update', entity_type: 'project', entity_id: String(editingProject.id), description: `Updated project "${form.project_name}"` });
    } else {
      const { data, error } = await supabase.from('hub_projects').insert(payload).select('id').single();
      if (error) { setFormError(error.message); setFormSaving(false); return; }
      logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'create', entity_type: 'project', description: `Created ${isRetainer ? 'retainer' : isInternal ? 'internal' : 'client'} project "${form.project_name}"` });
      // Auto-create Google Drive folder (fire and forget — don't block save)
      if (data && !(payload as any).drive_url) {
        supabase.functions.invoke('create-project-drive-folder', {
          body: { project_id: data.id, client_name: payload.client_name, project_name: payload.project_name },
        }).catch(console.error);
      }
      // Auto-assign the creator (owner/admin) to the new project
      if (data && hubUser?.id) {
        await supabase.from('hub_project_contractors').insert({
          project_id: data.id,
          contractor_id: hubUser.id,
          payout_type: 'percentage',
          percentage: 0,
          payout_status: 'pending',
        }).then(({ error: e }) => { if (e) console.error('Auto-assign owner failed:', e); });
      }
      if (data) {
        setActiveId(data.id);
        if (importedTasks.length > 0) {
          await supabase.from('hub_project_tasks').insert(
            importedTasks.map(t => ({
              project_id: data.id,
              title: t.title,
              description: t.description || null,
              status: 'todo' as const,
              priority: t.priority,
              start_date: t.start_date || null,
              due_date: t.due_date || null,
              assigned_to: null,
            }))
          );
        }
      }
    }
    setFormSaving(false); setShowForm(false); setEditingProject(null); setForm(emptyForm); setImportedTasks([]);
    fetchAll();
  };

  const deleteProject = async (project: Project) => {
    if (isDemo) return;
    const hasData = project.hub_project_payments.length > 0 || project.hub_project_contractors.length > 0;
    const dataWarning = hasData ? '\n\nThis project has data (payments, team assignments) that will also be deleted.' : '';
    const confirmed = window.confirm(
      `Delete "${project.project_name}"?\n\nThis will permanently delete the project, all assignments, tasks, activity, payments, costs, and reminders. This cannot be undone.${dataWarning}`
    );
    if (!confirmed) return;
    const { error } = await supabase.from('hub_projects').delete().eq('id', project.id);
    if (error) {
      console.error('Delete project error:', error);
      window.alert(`Could not delete project: ${error.message}`);
      return;
    }
    logAudit({
      actor_id: hubUser?.id,
      actor_name: hubUser?.full_name,
      action: 'delete',
      entity_type: 'project',
      entity_id: String(project.id),
      description: `Deleted project "${project.project_name}"`,
    });
    if (activeId === project.id) {
      setActiveId(null);
      setWorkspaceOpen(false);
    }
    fetchAll();
  };

  // Unarchiving a finished project needs a decision: is work actually resuming,
  // or should it just become visible again? This holds the project while we ask.
  const [unarchiveChoice, setUnarchiveChoice] = useState<Project | null>(null);

  const doUnarchive = async (project: Project, newStatus: string | null) => {
    const payload: Record<string, unknown> = { archived_at: null, updated_at: new Date().toISOString() };
    if (newStatus) payload.status = newStatus;
    const { error } = await supabase.from('hub_projects').update(payload).eq('id', project.id);
    if (error) { window.alert(`Failed to unarchive project: ${error.message}`); return; }
    logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'update', entity_type: 'project', entity_id: String(project.id), description: `Unarchived project "${project.project_name}"${newStatus ? ` and reopened it as ${newStatus === 'ongoing' ? 'active' : newStatus}` : ''}` });
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, archived_at: null, ...(newStatus ? { status: newStatus } : {}) } : p));
    setUnarchiveChoice(null);
  };

  const updateProjectStatus = async (project: Project, newStatus: string) => {
    if (newStatus === project.status) return;
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: newStatus } as Project : p));
    const { error } = await supabase.from('hub_projects').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', project.id);
    if (error) {
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: project.status } : p));
      window.alert(`Failed to update status: ${error.message}`);
      return;
    }
    logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'update', entity_type: 'project', entity_id: String(project.id), description: `Changed "${project.project_name}" status to ${newStatus}` });
  };

  const toggleArchiveProject = async (project: Project) => {
    if (isDemo) return;
    if (project.archived_at || project.status === 'cancelled') {
      // Finished projects get the reopen-vs-restore question; anything archived
      // mid-flight (paused/ongoing) just comes straight back as it was.
      if (project.status === 'completed' || project.status === 'cancelled') {
        setUnarchiveChoice(project);
      } else {
        await doUnarchive(project, null);
      }
      return;
    }
    const archived_at = new Date().toISOString();
    const { error } = await supabase.from('hub_projects').update({ archived_at, updated_at: new Date().toISOString() }).eq('id', project.id);
    if (error) { window.alert(`Failed to archive project: ${error.message}`); return; }
    logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'update', entity_type: 'project', entity_id: String(project.id), description: `Archived project "${project.project_name}"` });
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, archived_at } : p));
    setActiveId(null); // close the drawer — the project moves to the Archived tab
  };

  const logPayment = async () => {
    if (!activeId || !payAmount) return;
    setPaySaving(true); setPayError('');

    let receipt_url: string | null = null;
    if (payReceipt) {
      try {
        receipt_url = await uploadFileToDrive(payReceipt, 'payout_receipt', { year: new Date().getFullYear().toString() });
      } catch (err) {
        setPaySaving(false);
        setPayError(err instanceof Error ? err.message : 'Receipt upload failed');
        return;
      }
    }

    const amountPHP = payCurrency === 'USD' ? parseFloat(payAmount) * usdRate : parseFloat(payAmount);
    const noteWithCurrency = payCurrency === 'USD' ? `$${payAmount} USD @ ₱${usdRate}${payNotes ? ' · ' + payNotes : ''}` : (payNotes || null);
    const { error } = await supabase.from('hub_project_payments').insert({
      project_id: activeId, amount: amountPHP, paid_at: payDate, notes: noteWithCurrency, receipt_url,
    });
    setPaySaving(false);
    if (error) { setPayError(error.message); return; }

    // Apply the payment to open Invoice Log entries (oldest first) so the
    // dashboard's outstanding-invoices banner reflects money already received.
    try {
      const { data: openInvoices } = await supabase.from('hub_invoice_log')
        .select('id, invoice_number, balance')
        .eq('project_id', activeId)
        .eq('settled', false)
        .gt('balance', 0)
        .order('sent_at', { ascending: true });
      // Resends/reminders can duplicate rows per invoice — group by invoice
      // number (newest balance wins) so one payment isn't applied twice.
      const byInvoice = new Map<string, { ids: number[]; invoice_number: string; balance: number }>();
      for (const inv of openInvoices ?? []) {
        const key = inv.invoice_number || `row-${inv.id}`;
        const g = byInvoice.get(key);
        if (g) { g.ids.push(inv.id); g.balance = inv.balance; }
        else byInvoice.set(key, { ids: [inv.id], invoice_number: inv.invoice_number, balance: inv.balance });
      }
      let remaining = amountPHP;
      for (const inv of byInvoice.values()) {
        if (remaining <= 0) break;
        const applied = Math.min(remaining, inv.balance);
        remaining -= applied;
        const newBalance = inv.balance - applied;
        const settledNow = newBalance <= 0.5; // centavo dust doesn't keep an invoice open
        const { error: invErr } = await supabase.from('hub_invoice_log').update({
          balance: settledNow ? 0 : newBalance,
          ...(settledNow ? { settled: true, settled_at: new Date().toISOString() } : {}),
        }).in('id', inv.ids);
        if (invErr) { console.error('Invoice log sync failed:', invErr.message); break; }
      }
    } catch (e) {
      console.error('Invoice log sync failed:', e);
    }

    setPayAmount(''); setPayNotes(''); setPayReceipt(null); setPayCurrency('PHP');
    fetchAll();
  };


  const [openingWorkspace, setOpeningWorkspace] = useState(false);

  // Row click → straight into the workspace. Uses openWorkspaceOnLoad so the
  // activeId effect (which resets workspaceOpen when ws!=1) opens it instead.
  const openProjectWorkspace = (id: number) => {
    setActiveClientId(null);
    if (activeId === id) { setWorkspaceOpen(true); return; }
    openWorkspaceOnLoad.current = true; // keeps the activeId effect from resetting workspaceOpen
    setTasks([]);            // don't flash the previous project's tasks in the new workspace
    setActiveId(id);
    setWorkspaceOpen(true);  // same render as activeId — the drawer never gets a frame to flicker
  };

  // Client status page: copy the shareable link, generating the token on first use
  const shareClientStatus = async () => {
    if (!activeProject) return;
    let token = activeProject.client_status_token ?? null;
    if (!token) {
      token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '').slice(0, 48);
      const { error } = await supabase.from('hub_projects').update({ client_status_token: token }).eq('id', activeProject.id);
      if (error) { window.alert(`Could not create client link: ${error.message}`); return; }
      setProjects(prev => prev.map(pp => pp.id === activeProject.id ? { ...pp, client_status_token: token } : pp));
      logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'create', entity_type: 'project', entity_id: String(activeProject.id), description: `Created client status link for "${activeProject.project_name}"` });
    }
    try { await navigator.clipboard.writeText(`https://hunacreatives.com/status/${token}`); } catch { /* clipboard blocked */ }
    setClientLinkCopied(true);
    setTimeout(() => setClientLinkCopied(false), 2000);
  };

  const openClientWorkspace = async (client: typeof intlClients[0]) => {
    setOpeningWorkspace(true);
    try {
      // Check if a retainer project already exists for this client
      const project = projects.find(p =>
        p.project_type === 'retainer' && (
          p.client_name.toLowerCase() === client.client_name.toLowerCase() ||
          p.project_name.toLowerCase() === client.client_name.toLowerCase()
        )
      );
      if (!project) {
        const { data, error } = await supabase.from('hub_projects').insert({
          project_type: 'retainer',
          client_name: client.client_name,
          project_name: client.client_name,
          service: client.platform ?? 'Marketing',
          contract_price: 0,
          monthly_rate: client.contract_value ?? 0,
          status: 'ongoing',
          notes: client.notes ?? null,
        }).select('id').single();
        if (error) { alert(`Could not create workspace: ${error.message}`); return; }
        if (client.assignments.length > 0) {
          const { error: assignErr } = await supabase.from('hub_project_contractors').insert(
            client.assignments.map(a => ({ project_id: data.id, contractor_id: a.contractor_id, payout_type: 'percentage', percentage: 0, payout_status: 'pending' }))
          );
          if (assignErr) console.error(assignErr);
        }
        await fetchAll();
        setActiveId(data.id);
      } else {
        setActiveId(project.id);
      }
      setActiveClientId(null);
    } finally {
      setOpeningWorkspace(false);
    }
  };


  const logCost = async () => {
    if (!activeId || !costLabel.trim() || !costAmount) return;
    setCostSaving(true); setCostError('');
    const { error } = await supabase.from('hub_project_costs').insert({
      project_id: activeId, label: costLabel.trim(), amount: parseFloat(costAmount), date: costDate,
    });
    setCostSaving(false);
    if (error) { setCostError(error.message); return; }
    setCostLabel(''); setCostAmount('');
    fetchAll();
  };

  const deletePayment = async (pid: number) => {
    await supabase.from('hub_project_payments').delete().eq('id', pid);
    fetchAll();
  };

  const updatePayment = async () => {
    if (!editPayForm.amount) return;
    setEditPaySaving(true); setEditPayError('');

    let receipt_url = editPayForm.existingReceiptUrl;
    if (editPayForm.receipt) {
      try {
        receipt_url = await uploadFileToDrive(editPayForm.receipt, 'payout_receipt', { year: new Date().getFullYear().toString() });
      } catch (err) {
        setEditPaySaving(false);
        setEditPayError(err instanceof Error ? err.message : 'Receipt upload failed');
        return;
      }
    }

    const { error } = await supabase.from('hub_project_payments').update({
      amount: parseFloat(editPayForm.amount),
      paid_at: editPayForm.date,
      notes: editPayForm.notes || null,
      receipt_url,
    }).eq('id', editingPaymentId!);

    setEditPaySaving(false);
    if (error) { setEditPayError(error.message); return; }
    setEditingPaymentId(null);
    fetchAll();
  };

  const deleteCost = async (cid: number) => {
    await supabase.from('hub_project_costs').delete().eq('id', cid);
    fetchAll();
  };

  const addContractor = async () => {
    if (!activeId || !addCtxId) return;
    const contractorId = addCtxId;
    const wasAlreadyAssigned = !!activeProject?.hub_project_contractors.some(pc => pc.hub_users?.id === contractorId);
    setCtxSaving(true); setCtxAddError('');
    const { error } = await supabase.from('hub_project_contractors').upsert({
      project_id: activeId,
      contractor_id: contractorId,
      project_role: addCtxRole.trim() || null,
      payout_type: 'percentage',
      percentage: 0,
      fixed_amount: null,
    }, { onConflict: 'project_id,contractor_id' });
    setCtxSaving(false);
    if (error) { setCtxAddError(error.message); return; }
    setAddCtxId(''); setAddCtxRole('');
    if (!wasAlreadyAssigned) {
      supabase.functions.invoke('notify-project-assigned', {
        body: { project_id: activeId, contractor_id: contractorId },
      }).catch(console.error);
      const proj = projects.find(p => p.id === activeId);
      if (proj) {
        createHubNotifications([{
          user_id: contractorId, type: 'project_assigned',
          title: 'New project assigned',
          body: `You've been added to "${proj.project_name}"`,
          link: '/hub/contractor/projects', read: false,
        }]).catch(console.error);
      }
    }
    fetchAll();
  };

  const saveContractorPayoutConfig = async (pcId: number) => {
    const form = ctxConfigForm[pcId];
    if (!form) return;
    const isPercentage = form.payoutType === 'percentage';
    if (isPercentage && !form.percentage) {
      setCtxConfigError(prev => ({ ...prev, [pcId]: 'Percentage is required.' }));
      return;
    }
    if (!isPercentage && !form.fixedAmount) {
      setCtxConfigError(prev => ({ ...prev, [pcId]: 'Fixed fee amount is required.' }));
      return;
    }

    setCtxConfigSaving(prev => ({ ...prev, [pcId]: true }));
    setCtxConfigError(prev => ({ ...prev, [pcId]: '' }));

    const { error } = await supabase.from('hub_project_contractors').update({
      payout_type: form.payoutType,
      percentage: isPercentage ? parseFloat(form.percentage) : 0,
      fixed_amount: isPercentage ? null : parseFloat(form.fixedAmount),
    }).eq('id', pcId);

    setCtxConfigSaving(prev => ({ ...prev, [pcId]: false }));
    if (error) {
      setCtxConfigError(prev => ({ ...prev, [pcId]: error.message }));
      return;
    }

    fetchAll();
  };

  const removeContractor = async (id: number) => {
    await supabase.from('hub_project_contractors').delete().eq('id', id);
    fetchAll();
  };

  const toggleExcludeFromPayout = async (pcId: number, current: boolean) => {
    await supabase.from('hub_project_contractors').update({ exclude_from_payout: !current }).eq('id', pcId);
    fetchAll();
  };

  const logContractorPayout = async (pcId: number, cut: number, contractorName: string, contractorEmail: string | null, project: Project) => {
    const form = ctxPayForm[pcId];
    if (!form?.amount) return;
    setCtxPaySaving(p => ({ ...p, [pcId]: true }));
    setCtxPayError(p => ({ ...p, [pcId]: '' }));
    setCtxPayWarn(p => ({ ...p, [pcId]: '' }));

    let receipt_url: string | null = null;
    if (form.receipt) {
      try {
        receipt_url = await uploadFileToDrive(form.receipt, 'payout_receipt', { year: new Date().getFullYear().toString() });
      } catch (err) {
        setCtxPaySaving(p => ({ ...p, [pcId]: false }));
        const why = err instanceof Error ? err.message : 'unknown error';
        setCtxPayError(p => ({ ...p, [pcId]: `Receipt upload failed — ${why}. The payout was not recorded; remove the receipt to log it without one.` }));
        return;
      }
    }

    const amount = parseFloat(form.amount);
    const paid_at = form.date || localToday();
    const { error } = await supabase.from('hub_project_contractor_payouts').insert({
      project_contractor_id: pcId,
      amount,
      paid_at,
      notes: form.notes || null,
      receipt_url,
    });
    setCtxPaySaving(p => ({ ...p, [pcId]: false }));
    if (error) { setCtxPayError(p => ({ ...p, [pcId]: error.message })); return; }

    // auto-mark paid if fully paid
    const pc = projects.flatMap(p => p.hub_project_contractors).find(x => x.id === pcId);
    const prev = pc?.hub_project_contractor_payouts.reduce((s, x) => s + x.amount, 0) ?? 0;
    const newTotal = prev + amount;
    const remaining = Math.max(cut - newTotal, 0);
    setCtxPayForm(p => ({ ...p, [pcId]: { amount: remaining > 0 ? remaining.toFixed(2) : '', date: localToday(), notes: '', receipt: null, notify: true } }));
    logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'approve', entity_type: 'project_payout', description: `Logged payout of ₱${form.amount} to ${contractorName}` });

    if (pc && newTotal >= cut) {
      await supabase.from('hub_project_contractors').update({ payout_status: 'paid', paid_at: new Date().toISOString() }).eq('id', pcId);
    }

    // Send email notification
    if (form.notify && contractorEmail) {
      void supabase.functions.invoke('notify-contractor-payment', {
        body: {
          to: contractorEmail,
          contractor_name: contractorName,
          project_name: project.project_name,
          client_name: project.client_name,
          amount,
          paid_at,
          notes: form.notes || null,
          receipt_url,
          total_paid: newTotal,
          total_cut: cut,
          is_fully_paid: newTotal >= cut,
        },
      })
        .then(({ error: notifyError }) => {
          if (!notifyError) return;
          setCtxPayWarn(p => ({
            ...p,
            [pcId]: `Payout recorded, but the email to ${contractorName} did not send — ${notifyError.message}. Let them know directly.`,
          }));
        })
        .catch((err: unknown) => {
          const why = err instanceof Error ? err.message : 'unknown error';
          setCtxPayWarn(p => ({
            ...p,
            [pcId]: `Payout recorded, but the email to ${contractorName} did not send — ${why}. Let them know directly.`,
          }));
        });
    }

    fetchAll();
  };

  const deleteContractorPayout = async (payoutId: number) => {
    await supabase.from('hub_project_contractor_payouts').delete().eq('id', payoutId);
    fetchAll();
  };

  const addReminder = async () => {
    if (!activeId || !reminderDate) return;
    setReminderSaving(true); setReminderError('');
    const { error } = await supabase.from('hub_payment_reminders').insert({
      project_id: activeId,
      send_date: reminderDate,
      amount_due: reminderAmount ? parseFloat(reminderAmount) : null,
      notes: reminderNotes || null,
      status: 'pending',
    });
    setReminderSaving(false);
    if (error) { setReminderError(error.message); return; }
    setReminderDate(''); setReminderAmount(''); setReminderNotes('');
    fetchAll();
  };

  const deleteReminder = async (rid: number) => {
    await supabase.from('hub_payment_reminders').delete().eq('id', rid);
    fetchAll();
  };


  const projectTypes = Array.from(new Set(projects.map(p => p.service).filter(Boolean) as string[])).sort();

  // Main grid: one-time + internal only (retainers shown in Clients section below)
  // Archived = explicitly archived (or legacy 'cancelled' status). Archived
  // projects only appear under the Archived tab; their workspaces stay openable.
  const isArchivedProject = (p: Project) => !!p.archived_at || p.status === 'cancelled';

  const filtered = projects.filter(p => {
    if (p.project_type === 'retainer') return false;
    const matchesSearch = !search || p.client_name.toLowerCase().includes(search.toLowerCase()) || p.project_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'archived'
      ? isArchivedProject(p)
      : !isArchivedProject(p) && (statusFilter === 'all' || p.status === statusFilter);
    const matchesType = typeFilter === 'all' || p.service === typeFilter;
    const matchesProjectType = projectTypeFilter === 'all' || p.project_type === projectTypeFilter;
    return matchesSearch && matchesStatus && matchesType && matchesProjectType;
  });

  // Retainer projects for the clients section
  const retainerProjects = projects.filter(p => p.project_type === 'retainer' &&
    (!search || p.client_name.toLowerCase().includes(search.toLowerCase()) || p.project_name.toLowerCase().includes(search.toLowerCase()))
  );

  const deadlineStatus = (deadline: string | null, status: string) => {
    if (!deadline || status === 'completed' || status === 'cancelled') return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(deadline); due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: 'bg-red-100 text-red-600' };
    if (diff <= 7) return { label: `${diff}d left`, cls: 'bg-amber-100 text-amber-600' };
    return null;
  };

  // Shared project row renderer — used both by the stage-grouped list below
  // and (identically) wherever else a project row needs to render. Pulled
  // out of the JSX so the stage groups don't have to duplicate this markup.
  const renderProjectRow = (p: Project) => {
    const cfg = statusCfg[p.status] ?? statusCfg.ongoing;
    const dl = deadlineStatus(p.deadline, p.status);
    const pTasks = tasks.filter(t => t.project_id === p.id && !t.deleted_at);
    const pTasksDone = pTasks.filter(t => t.status === 'done').length;
    const pal = getServicePalette(p.service);
    const team = p.hub_project_contractors.map((pc: any) => pc.hub_users).filter(Boolean);
    const isSelected = activeId === p.id;
    const badge = dl ?? (p.status !== 'ongoing' ? cfg : null);
    return (
      <div key={p.id} role="button" tabIndex={0}
        onClick={() => openProjectWorkspace(p.id)}
        onKeyDown={e => { if (e.key === 'Enter') openProjectWorkspace(p.id); }}
        className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all group cursor-pointer ${isSelected ? 'bg-[#FF6B35]/5' : 'hover:bg-gray-50/60'}`}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${pal.from}, ${pal.to})` }}>
          <span className="text-[13px] font-bold text-white">{p.project_name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#111827] truncate leading-snug">{p.project_name}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{p.project_type === 'internal' ? 'Internal' : p.client_name}{p.service ? ` · ${p.service}` : ''}</p>
        </div>
        <div className="hidden sm:flex -space-x-2 flex-shrink-0">
          {team.slice(0, 4).map((u: any, i: number) => (
            u?.avatar_url
              ? <img key={i} src={u.avatar_url} alt={u.full_name} className="w-7 h-7 rounded-full object-cover object-top border-2 border-white shadow-sm" />
              : <div key={i} className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-gray-500">{u?.full_name?.[0]}</div>
          ))}
          {team.length === 0 && <div className="w-7 h-7 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center"><i className="ri-user-line text-[9px] text-gray-300"></i></div>}
        </div>
        {pTasks.length > 0 && (
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((pTasksDone / pTasks.length) * 100)}%`, background: pal.from }} />
            </div>
            <span className="text-[11px] text-gray-400 w-8">{pTasksDone}/{pTasks.length}</span>
          </div>
        )}
        {badge ? (
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
        ) : (
          <span className="text-[11px] text-gray-400 flex-shrink-0">Active</span>
        )}
        <button
          onClick={e => { e.stopPropagation(); setActiveClientId(null); setActiveId(p.id); }}
          title="Payments, payouts & contract"
          className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 cursor-pointer transition-colors ${isSelected ? 'text-[#FF6B35] bg-[#FF6B35]/10' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}>
          <i className="ri-wallet-3-line text-base"></i>
        </button>
        <i className="ri-arrow-right-s-line text-gray-300 group-hover:text-gray-500 transition-colors text-lg flex-shrink-0" />
      </div>
    );
  };

  const statusTabs = [
    { key: 'all' as const, label: 'All', icon: 'ri-apps-2-line', count: projects.filter(p => !isArchivedProject(p)).length },
    { key: 'ongoing' as const, label: 'Active', icon: 'ri-flashlight-line', count: projects.filter(p => p.status === 'ongoing' && !isArchivedProject(p)).length },
    { key: 'paused' as const, label: 'Paused', icon: 'ri-pause-circle-line', count: projects.filter(p => p.status === 'paused' && !isArchivedProject(p)).length },
    { key: 'completed' as const, label: 'Completed', icon: 'ri-check-double-line', count: projects.filter(p => p.status === 'completed' && !isArchivedProject(p)).length },
    { key: 'archived' as const, label: 'Archived', icon: 'ri-archive-line', count: projects.filter(isArchivedProject).length },
  ];

  // ── Team tab window math (daily/weekly/monthly), shared by the Team tab
  // card grid below. completed_at is Huna's column name for what fs-architects
  // calls done_at.
  const teamToday = localToday();
  const windowDays = teamWindow === 'daily' ? 0 : teamWindow === 'weekly' ? 7 : 30;
  const daysOut = (t: any) => t.due_date ? Math.ceil((new Date(t.due_date + 'T00:00:00').getTime() - new Date(teamToday + 'T00:00:00').getTime()) / 86400000) : null;
  const doneInWindow = (taskList: any[]) => taskList.filter((t: any) => {
    if (t.status !== 'done' || !t.completed_at) return false;
    const dd = new Date(t.completed_at);
    const doneDateStr = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
    if (doneDateStr > teamToday) return false;
    const daysAgo = Math.floor((new Date(teamToday + 'T00:00:00').getTime() - new Date(doneDateStr + 'T00:00:00').getTime()) / 86400000);
    return daysAgo <= windowDays;
  });

  // ── Team Overview hero (mirrors fs-architects' company-wide snapshot) ──
  // Driven by the same teamWindow (Daily/Weekly/Monthly) toggle as the Team
  // tab, so switching it updates the hero stats too.
  const heroToday = teamToday;
  const heroDueLabel = teamWindow === 'daily' ? 'Due today' : teamWindow === 'weekly' ? 'Due this week' : 'Due this month';
  const heroOpenTasks = allTasks.filter((t: any) => t.status !== 'done' && !t.archived);
  const heroDueInWindowCount = heroOpenTasks.filter((t: any) => {
    if (!t.due_date || t.due_date < heroToday) return false;
    const d = daysOut(t);
    return d !== null && d <= windowDays;
  }).length;
  const heroOverdueCount = heroOpenTasks.filter((t: any) => t.due_date && t.due_date < heroToday).length;
  const heroActiveProjectsCount = projects.filter(p => p.status === 'ongoing').length;
  const heroRelevantOpen = heroOpenTasks.filter((t: any) => {
    if (t.due_date && t.due_date < heroToday) return true;
    if (!t.due_date) return windowDays >= 30;
    const d = daysOut(t);
    return d !== null && d <= windowDays;
  });
  const heroDoneInWindow = doneInWindow(allTasks);
  const heroWindowTotal = heroRelevantOpen.length + heroDoneInWindow.length;
  const heroPct = heroWindowTotal > 0 ? Math.round((heroDoneInWindow.length / heroWindowTotal) * 100) : 0;

  useEffect(() => {
    // Only reset if the activeId doesn't exist anywhere in projects (truly gone,
    // e.g. deleted). Retainers are excluded from `filtered`, so an empty filter
    // list must not deselect a retainer workspace.
    if (activeId && projects.length > 0 && !projects.some(p => p.id === activeId)) {
      setActiveId(filtered[0]?.id ?? null);
    }
  }, [filtered, activeId, projects]);

  useEffect(() => {
    if (activeId && !isDemo) {
      fetchTasks(activeId);
      supabase.from('hub_questionnaires').select('id, client_name, service_type, status, submitted_at, questions, answers').eq('project_id', activeId).order('created_at', { ascending: false })
        .then(({ data }) => setWsQuestionnaires((data as WsQuestionnaireRow[]) ?? []));
      loadContracts(activeId);
      const proj = projects.find(p => p.id === activeId);
      if (proj?.client_name) {
        supabase.from('hub_proposals').select('slug, status, project_title').ilike('client_name', proj.client_name)
          .then(({ data }) => setClientProposals((data ?? []) as typeof clientProposals));
      }
    }
    else if (!activeId) { setTasks([]); setActivity([]); setCommentCounts({}); setWsQuestionnaires([]); setContracts([]); setContractsLoaded(null); setClientProposals([]); }
    if (openWorkspaceOnLoad.current) { setWorkspaceOpen(true); openWorkspaceOnLoad.current = false; }
    else if (searchParams.get('ws') !== '1') { setWorkspaceOpen(false); }
    setOpenSections({});
  }, [activeId, isDemo]);

  // Sync URL separately so changing workspaceOpen doesn't re-run the effect above and reset it
  useEffect(() => {
    if (activeId) setSearchParams(workspaceOpen ? { w: String(activeId), ws: '1' } : { w: String(activeId) }, { replace: true });
    else setSearchParams({}, { replace: true });
  }, [activeId, workspaceOpen]);

  useEffect(() => {
    if (!isDemo) refreshWorkspaceActivity();
  }, [isDemo, refreshWorkspaceActivity]);

  // Realtime: keep the open project's tasks in sync with other users' changes
  useEffect(() => {
    if (!activeId || isDemo) return;
    const channel = supabase.channel(`admin-project-tasks-${activeId}`)
      .on('postgres_changes' as any, {
        event: '*', schema: 'public', table: 'hub_project_tasks',
        filter: `project_id=eq.${activeId}`,
      }, (payload: any) => {
        if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId) setTasks(prev => prev.filter(t => t.id !== oldId));
          return;
        }
        const row = payload.new as ProjectTask | undefined;
        if (!row?.id) return;
        setTasks(prev => prev.some(t => t.id === row.id)
          ? prev.map(t => t.id === row.id ? { ...t, ...row } : t)
          : [...prev, row]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId, isDemo]);

  // Realtime: update comment counts when new comments arrive
  useEffect(() => {
    if (!activeId || isDemo) return;
    const channel = supabase.channel(`admin-task-comments-${activeId}`)
      .on('postgres_changes' as any, {
        event: 'INSERT', schema: 'public', table: 'hub_project_task_comments',
      }, (payload: any) => {
        const taskId = payload.new?.task_id;
        if (taskId) setCommentCounts(prev => ({ ...prev, [taskId]: (prev[taskId] ?? 0) + 1 }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId, isDemo]);

  // Select project on load; only open workspace when explicitly requested with ?ws=1
  const didInitWorkspace = useRef(false);
  const lastRouteKey = useRef<string | null>(null);
  useEffect(() => {
    if (projects.length === 0) return;
    const w = searchParams.get('w');
    const ws = searchParams.get('ws');
    const routeKey = `${w ?? ''}:${ws ?? ''}`;
    if (didInitWorkspace.current && routeKey === lastRouteKey.current) return;
    lastRouteKey.current = routeKey;
    if (w) {
      const id = parseInt(w);
      if (projects.some(p => p.id === id)) {
        didInitWorkspace.current = true;
        setActiveId(id);
        setWorkspaceOpen(ws === '1');
      }
    } else {
      didInitWorkspace.current = true;
    }
  }, [projects, searchParams]);

  // Deep-link: ?task=TASK_ID — capture immediately so URL sync can't strip it.
  // Held as state (not a ref) so the opener effect below fires even when
  // workspace and tasks haven't changed, e.g. clicking a notification for a
  // task in the workspace that's already open.
  const [pendingTask, setPendingTask] = useState<{ id: number; projectId: number | null } | null>(null);
  useEffect(() => {
    const taskParam = searchParams.get('task');
    if (!taskParam) return;
    const w = searchParams.get('w');
    setPendingTask({ id: parseInt(taskParam), projectId: w ? parseInt(w) : null });
  }, [searchParams]);

  // Open the pending task once its workspace + tasks are loaded
  useEffect(() => {
    if (!pendingTask || !workspaceOpen) return;
    // Workspace switched to a different project — the link's task no longer applies
    if (pendingTask.projectId && activeId && pendingTask.projectId !== activeId) { setPendingTask(null); return; }
    // Wait until the loaded tasks actually belong to the active project (the
    // previous project's tasks linger in state while the new fetch is in flight)
    if (!tasks.some(t => t.project_id === activeId)) return;
    const task = tasks.find(t => t.id === pendingTask.id);
    setPendingTask(null);
    if (task) openTaskDetail(task);
  }, [pendingTask, tasks, workspaceOpen, activeId]);

  const wsToday = localToday();
  const wsIsOverdue = (t: ProjectTask) => isTaskOverdue(t, wsToday);
  const wsArchivedTasks = tasks.filter(t => !!t.archived && !t.deleted_at);
  const wsTrashedTasks = tasks.filter(t => !!t.deleted_at);
  const wsFilteredTasks = tasks.filter(t => !t.archived && !t.deleted_at).filter(t => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'mine') return getTaskAssigneeIds(t).includes(hubUser?.id ?? '');
    if (taskFilter === 'overdue') return !!wsIsOverdue(t);
    return t.status === taskFilter;
  });
  const wsActiveTasks = tasks.filter(t => !t.archived && !t.deleted_at);
  const wsDoneCt = wsActiveTasks.filter(t => t.status === 'done').length;
  const wsPct = wsActiveTasks.length > 0 ? Math.round((wsDoneCt / wsActiveTasks.length) * 100) : 0;
  const wsTaskTeam = activeProject ? activeProject.hub_project_contractors.map(pc => pc.hub_users).filter(Boolean) : [];
  // Tasks opened from the Tasks/Team tabs (rather than from within an open
  // project workspace) have no activeProject, so wsTaskTeam would be empty —
  // resolve the assignee list from the task's own project instead.
  const detailProject = projects.find(p => p.id === (detailTask as any)?.project_id) ?? activeProject;
  const detailTaskTeam = detailProject ? detailProject.hub_project_contractors.map(pc => pc.hub_users).filter(Boolean) : [];
  const getWorkspaceTaskAssignees = (task: ProjectTask) =>
    getTaskAssigneeIds(task)
      .map((assigneeId) => wsTaskTeam.find((member) => member?.id === assigneeId))
      .filter(Boolean);
  const wsStatusCycle: Record<string, { icon: string; cls: string }> = {
    todo:        { icon: 'ri-checkbox-blank-circle-line',  cls: 'text-gray-300 hover:text-gray-500' },
    in_progress: { icon: 'ri-loader-2-line',               cls: 'text-sky-400 hover:text-sky-600' },
    in_review:   { icon: 'ri-eye-line',                    cls: 'text-purple-400 hover:text-purple-600' },
    blocked:     { icon: 'ri-indeterminate-circle-line',   cls: 'text-rose-400 hover:text-rose-600' },
    done:        { icon: 'ri-checkbox-circle-fill',        cls: 'text-emerald-500' },
  };
  const BOARD_COLUMNS: { key: ProjectTask['status']; label: string; icon: string; chip: string; empty: string }[] = [
    { key: 'todo', label: 'To Do', icon: 'ri-checkbox-blank-circle-line', chip: 'bg-gray-100 text-gray-600', empty: 'Nothing queued' },
    { key: 'in_progress', label: 'In Progress', icon: 'ri-loader-2-line', chip: 'bg-sky-100 text-sky-700', empty: 'Nothing in motion' },
    { key: 'in_review', label: 'In Review', icon: 'ri-eye-line', chip: 'bg-purple-100 text-purple-700', empty: 'Nothing to review' },
    { key: 'blocked', label: 'Blocked', icon: 'ri-indeterminate-circle-line', chip: 'bg-rose-100 text-rose-700', empty: 'No blocked work' },
    { key: 'done', label: 'Done', icon: 'ri-checkbox-circle-fill', chip: 'bg-emerald-100 text-emerald-700', empty: 'Nothing completed yet' },
  ];

  const BoardCard = (task: ProjectTask) => {
    const overdue = !!wsIsOverdue(task);
    const assignees = getWorkspaceTaskAssignees(task);
    const commentCount = commentCounts[task.id] ?? 0;
    const priorityCfg = PRIORITY_CFG[task.priority];
    const priorityBorder = { high: 'border-l-rose-400', medium: 'border-l-amber-400', low: 'border-l-gray-300' }[task.priority];
    return (
      <button
        key={task.id}
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/task-id', String(task.id));
          setDraggedTaskId(task.id);
        }}
        onDragEnd={() => { setDraggedTaskId(null); setBoardDragOver(null); }}
        onClick={() => openTaskDetail(task)}
        className={`w-full text-left rounded-2xl border border-gray-100 border-l-4 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md cursor-pointer ${(task as any).color ? '' : priorityBorder} ${draggedTaskId === task.id ? 'opacity-60' : ''}`}
        style={(task as any).color ? { borderLeftColor: (task as any).color } : undefined}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <p className={`flex-1 text-sm font-semibold leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${priorityCfg.cls}`}>{priorityCfg.label}</span>
            </div>
            {task.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{getTaskDescriptionPreview(task.description)}</p>}
            {task.status === 'blocked' && task.meta?.blocked_reason && <p className="text-[11px] text-rose-600 mt-1 line-clamp-1"><i className="ri-indeterminate-circle-line mr-0.5"></i> Blocked: {task.meta.blocked_reason}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-50">
          {task.due_date && (
            <span className={`text-[10px] font-medium ${overdue ? 'text-rose-600' : 'text-gray-500'}`}>
              {overdue ? 'Overdue' : new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {commentCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-semibold">
                <i className="ri-chat-3-fill text-[11px]"></i>{commentCount}
              </span>
            )}
            {assignees.length > 0 && (
              <div className="flex items-center -space-x-1">
                {assignees.slice(0, 3).map((assignee: any) => (
                  assignee.avatar_url
                    ? <img key={assignee.id} src={assignee.avatar_url} alt={assignee.full_name} className="w-5 h-5 rounded-full border border-white object-cover object-top" />
                    : <div key={assignee.id} className="w-5 h-5 rounded-full border border-white bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-500">{assignee.full_name[0]}</div>
                ))}
                {assignees.length > 3 && <span className="ml-1 text-[10px] text-gray-400 font-medium">+{assignees.length - 3}</span>}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <AdminLayout title="Projects">
      {workspaceOpen && activeProject && (() => {
        const p = activeProject;
        const internalProject = isInternalProject(p);
        const statusColors = PROJECT_STATUS_COLORS;
        const statusLabels: Record<string, string> = { ongoing: 'Active', completed: 'Completed', paused: 'Paused', cancelled: 'Archived' };
        const wsTeam = p.hub_project_contractors.map(pc => pc.hub_users).filter(Boolean) as { id: string; full_name: string; avatar_url: string | null }[];
        const daysLeft = p.deadline ? Math.ceil((new Date(p.deadline + 'T00:00:00').getTime() - new Date(wsToday + 'T00:00:00').getTime()) / 86400000) : null;
        const isDeadlineOver = daysLeft !== null && daysLeft < 0 && p.status !== 'completed';
        const d = derived(p);
        // Uncolored tasks fall back to their priority tint so the calendar matches
        // the task cards (rose = high, amber = medium, gray = low) instead of an
        // index-based palette that shifts as tasks are added or reordered.
        const PRIORITY_TINT = {
          high: { bar: '#ffe4e6', barText: '#be123c' },
          medium: { bar: '#fef3c7', barText: '#b45309' },
          low: { bar: '#f3f4f6', barText: '#6b7280' },
        } as const;
        const taskColorMap = Object.fromEntries(tasks.map(t => [t.id, PRIORITY_TINT[t.priority] ?? PRIORITY_TINT.low]));

        // Map tasks for GanttTimeline (admin tasks have assignee_id, no start_date — compatible via any cast)
        const ganttTasks = wsActiveTasks.map(t => ({
          id: t.id,
          project_id: t.project_id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          start_date: t.start_date ?? null,
          assigned_to: getPrimaryTaskAssigneeId(t),
          assignee_ids: getTaskAssigneeIds(t),
          color: (t as any).color ?? null,
        }));

        return (
          <div className="flex flex-col -mx-4 -my-4 md:-mx-6 md:-py-6 min-h-full bg-gray-50/50">
            {/* ── Header strip ── */}
            <div className="px-5 md:px-6 pt-4 pb-2 flex-shrink-0">
              {/* Back button row */}
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => { setWorkspaceOpen(false); setActiveId(null); setCollapsedGroups({}); }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 cursor-pointer transition-all shadow-sm flex-shrink-0">
                  <i className="ri-arrow-left-s-line text-base"></i>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500 truncate leading-tight">Back to Projects</p>
                </div>
                <button
                  onClick={() => {
                    const slug = (p as any).slug || slugify(p.client_name);
                    const url = `https://hunacreatives.com/hub/admin/project/${slug}`;
                    try {
                      navigator.clipboard.writeText(url).then(() => {
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }).catch(() => {
                        const el = document.createElement('textarea');
                        el.value = url;
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand('copy');
                        document.body.removeChild(el);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      });
                    } catch {
                      const el = document.createElement('textarea');
                      el.value = url;
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }
                  }}
                  title={linkCopied ? 'Copied!' : 'Copy project link'}
                  className={`flex items-center gap-1.5 h-8 px-2.5 rounded-xl border cursor-pointer transition-all shadow-sm flex-shrink-0 text-xs font-medium ${linkCopied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200'}`}>
                  <i className={`text-base ${linkCopied ? 'ri-check-line' : 'ri-link'}`}></i>
                  <span className="hidden sm:inline">{linkCopied ? 'Copied!' : 'Copy link'}</span>
                </button>
                {!isInternalProject(p) && (
                  <button
                    onClick={() => void shareClientStatus()}
                    title={clientLinkCopied ? 'Copied!' : 'Copy the client-facing status page link'}
                    className={`flex items-center gap-1.5 h-8 px-2.5 rounded-xl border cursor-pointer transition-all shadow-sm flex-shrink-0 text-xs font-medium ${clientLinkCopied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-200 text-gray-500 hover:text-[#FF6B35] hover:border-orange-200'}`}>
                    <i className={`text-base ${clientLinkCopied ? 'ri-check-line' : 'ri-global-line'}`}></i>
                    <span className="hidden sm:inline">{clientLinkCopied ? 'Copied!' : 'Client link'}</span>
                  </button>
                )}
              </div>

              {/* Info card */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">

                  {/* Left: project identity */}
                  <div className="min-w-0 lg:max-w-[280px] lg:flex-shrink-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <select
                        value={p.status}
                        onChange={e => void updateProjectStatus(p, e.target.value)}
                        title="Change project status"
                        className={`text-[10px] pl-2 pr-1.5 py-0.5 rounded-full font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-300 ${statusColors[p.status] ?? statusColors.ongoing}`}
                      >
                        <option value="ongoing">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Archived</option>
                      </select>
                      {internalProject && <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Internal</span>}
                      {p.service && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getServiceCfg(p.service).badge}`}>{p.service}</span>}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{p.project_name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{internalProject ? 'Internal Project' : p.client_name}</p>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {wsTeam.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1.5">
                            {wsTeam.slice(0, 5).map(m => (
                              m.avatar_url
                                ? <img key={m.id} src={m.avatar_url} alt={m.full_name} title={m.full_name} className="w-5 h-5 rounded-full border-2 border-white object-cover object-top shadow-sm" />
                                : <div key={m.id} title={m.full_name} className="w-5 h-5 rounded-full border-2 border-white bg-indigo-400 flex items-center justify-center text-[8px] font-bold text-white shadow-sm">{m.full_name[0]}</div>
                            ))}
                          </div>
                          <span className="text-[11px] text-gray-400">{wsTeam.length} member{wsTeam.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {isRetainerProject(p) && ((p as any).monthly_deliverables ?? 0) > 0 && (() => {
                        const quota = (p as any).monthly_deliverables as number;
                        const now = new Date();
                        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                        const delivered = wsActiveTasks.filter(t => t.status === 'done' && t.completed_at && t.completed_at &&
                          `${new Date(t.completed_at).getFullYear()}-${String(new Date(t.completed_at).getMonth() + 1).padStart(2, '0')}` === ym).length;
                        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                        const dLeft = lastDay - now.getDate();
                        const behind = delivered < quota && dLeft <= 7;
                        const cls = delivered >= quota
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : behind ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-gray-600 bg-gray-50 border-gray-200';
                        return (
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>
                            <i className="ri-stack-line text-[10px]"></i>
                            {now.toLocaleDateString('en-US', { month: 'short' })}: {delivered}/{quota} delivered · {dLeft}d left
                          </span>
                        );
                      })()}

                      {daysLeft !== null && p.status !== 'completed' && p.status !== 'cancelled' && (
                        isDeadlineOver ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-medium">
                            <i className="ri-alarm-warning-line text-[10px]"></i>{Math.abs(daysLeft)}d overdue
                          </span>
                        ) : daysLeft === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            <i className="ri-time-line text-[10px]"></i>Due today
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${daysLeft <= 7 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-gray-500 bg-gray-50 border-gray-200'}`}>
                            <i className="ri-calendar-line text-[10px]"></i>
                            {daysLeft}d left · {new Date(p.deadline! + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Right: Drive */}
                  <div className="hidden lg:block lg:flex-1 lg:min-w-0">
                    {(() => {
                      const driveUrl = (p as any).drive_url as string | null;
                      const folderIdMatch = driveUrl?.match(/folders\/([a-zA-Z0-9_-]+)/);
                      const folderId = folderIdMatch?.[1];
                      const embedUrl = folderId ? `https://drive.google.com/embeddedfolderview?id=${folderId}#grid` : null;
                      return embedUrl && driveUrl ? (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-[#f1f3f7] shadow-sm">
                          <div className="flex items-center justify-end border-b border-gray-200/80 px-3 py-1.5">
                            <a href={driveUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-600 hover:text-blue-600 transition-colors">
                              <svg viewBox="0 0 87.3 78" className="h-3 w-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                              </svg>
                              Open Drive <i className="ri-external-link-line text-[10px]"></i>
                            </a>
                          </div>
                          <div className="h-[110px] overflow-hidden">
                            <iframe src={embedUrl} className="bg-[#f1f3f7]"
                              style={{ width: '200%', height: 220, border: 'none', transform: 'scale(0.5)', transformOrigin: 'top left' }}
                              title="Project Files" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3">
                          <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <i className="ri-folder-line text-gray-300 text-base"></i>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">No Drive folder linked</p>
                            <p className="text-[10px] text-gray-400">Add a Google Drive URL when editing this project</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div id="ws-scroll" className="flex-1 px-5 md:px-6 pb-6 space-y-5 overflow-y-auto">
              {/* ── Stats row ── */}
              <div id="ws-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Total', value: wsActiveTasks.length, icon: 'ri-task-line', iconBg: 'bg-gray-100', iconClr: 'text-gray-500', valClr: 'text-gray-800' },
                  { label: 'Done', value: wsDoneCt, icon: 'ri-checkbox-circle-fill', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', valClr: 'text-emerald-700' },
                  { label: 'In Progress', value: wsActiveTasks.filter(t => t.status === 'in_progress').length, icon: 'ri-loader-2-line', iconBg: 'bg-sky-100', iconClr: 'text-sky-600', valClr: 'text-sky-700' },
                  { label: 'Overdue', value: wsActiveTasks.filter(t => !!wsIsOverdue(t)).length, icon: 'ri-alarm-warning-line', iconBg: 'bg-rose-100', iconClr: 'text-rose-500', valClr: 'text-rose-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl px-3 py-2.5 shadow-sm border border-gray-100/80 flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <i className={`${s.icon} ${s.iconClr} text-xs`}></i>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${s.valClr} leading-none`}>{s.value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>


              {/* ── Calendar / Timeline ── */}
              <div id="ws-timeline" className="hidden sm:block">
                <GanttTimeline
                  tasks={ganttTasks as any}
                  projectStart={p.start_date}
                  projectEnd={p.deadline}
                  today={wsToday}
                  colorMap={taskColorMap}
                  onAddTaskForDate={openNewTaskForDate}
                  onTaskUpdate={async (taskId, updates) => {
                    await supabase.from('hub_project_tasks').update({
                      ...(updates.due_date !== undefined && { due_date: updates.due_date }),
                      ...(updates.start_date !== undefined && { start_date: updates.start_date }),
                    }).eq('id', taskId);
                    fetchTasks(activeId!);
                  }}
                />
              </div>

              {/* ── Two-column: tasks + sidebar ── */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Task list */}
                <div
                  id="ws-tasks"
                  className={`min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${
                    taskView === 'board' ? 'flex-[1_1_100%]' : 'flex-1'
                  }`}
                >
                  <div className="px-5 py-4 border-b border-gray-50 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <h3 className="font-semibold text-gray-800">Tasks</h3>
                        {wsActiveTasks.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-14 sm:w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${wsPct}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{wsDoneCt}/{wsActiveTasks.length}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                        <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() => setTaskView('list')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                              taskView === 'list' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            List
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTaskView('board');
                              setTaskFilter('all');
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                              taskView === 'board' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Board
                          </button>
                        </div>
                        <button
                          onClick={openNewTask}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF6B35] text-white text-xs font-semibold rounded-lg hover:bg-[#e55a27] shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-add-line text-sm"></i>
                          <span className="hidden sm:inline">Add Task</span><span className="sm:hidden">Add</span>
                        </button>
                      </div>
                    </div>
                    <div className={`flex gap-1 flex-wrap ${taskView === 'board' ? 'hidden' : ''}`}>
                      {(['all', 'mine', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'overdue'] as const).map(f => {
                        const labels: Record<string, string> = { all: 'All', mine: 'Mine', todo: 'To Do', in_progress: 'Active', in_review: 'Review', blocked: 'Blocked', done: 'Done', overdue: 'Overdue' };
                        const myId = hubUser?.id ?? '';
                        const activeTasks = tasks.filter(t => !t.archived && !t.deleted_at);
                        const counts: Record<string, number> = {
                          all: activeTasks.length,
                          mine: activeTasks.filter(t => getTaskAssigneeIds(t).includes(myId)).length,
                          todo: activeTasks.filter(t => t.status === 'todo').length,
                          in_progress: activeTasks.filter(t => t.status === 'in_progress').length,
                          in_review: activeTasks.filter(t => t.status === 'in_review').length,
                          blocked: activeTasks.filter(t => t.status === 'blocked').length,
                          done: activeTasks.filter(t => t.status === 'done').length,
                          overdue: activeTasks.filter(t => !!wsIsOverdue(t)).length,
                        };
                        if (f !== 'all' && f !== 'mine' && counts[f] === 0) return null;
                        if (f === 'mine' && counts.mine === 0) return null;
                        return (
                          <button key={f} onClick={() => setTaskFilter(f)}
                            className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${taskFilter === f ? (f === 'mine' ? 'bg-[#FF6B35] text-white' : 'bg-[#111827] text-white') : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            {labels[f]}{f !== 'all' && <span className="ml-1 opacity-60">{counts[f]}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add task form */}
                  {showTaskForm && (
                    <div className="px-5 py-3 bg-indigo-50/50 border-b border-indigo-100/60 space-y-2">
                      <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Task title..."
                        autoFocus onKeyDown={e => e.key === 'Enter' && createTask()}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white" />
                      <div className="flex items-center gap-2">
                        {uploadingAttachment ? (
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <i className="ri-upload-cloud-2-line text-indigo-400 text-sm"></i>
                              <span className="text-xs text-indigo-600 font-medium truncate">{newTaskAttachment?.name}</span>
                            </div>
                            <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-400 rounded-full animate-upload-progress" style={{ width: '40%' }} />
                            </div>
                            <p className="text-[10px] text-indigo-400">Uploading to Drive…</p>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => newTaskAttachmentRef.current?.click()}
                              className="px-3 py-1.5 text-xs border border-dashed border-indigo-200 text-indigo-700 rounded-lg bg-white hover:bg-indigo-50 cursor-pointer whitespace-nowrap"
                            >
                              <i className="ri-attachment-2 mr-1"></i>
                              {newTaskAttachment ? 'Change attachment' : 'Add attachment'}
                            </button>
                            {newTaskAttachment && (
                              <div className="min-w-0 flex items-center gap-2 text-xs text-gray-600">
                                <span className="truncate">{newTaskAttachment.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewTaskAttachment(null);
                                    if (newTaskAttachmentRef.current) newTaskAttachmentRef.current.value = '';
                                  }}
                                  className="text-gray-400 hover:text-rose-500 cursor-pointer"
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        <input
                          ref={newTaskAttachmentRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => setNewTaskAttachment(e.target.files?.[0] ?? null)}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setNewTaskAssigneeIds([])}
                            className={`px-2.5 py-1 text-xs rounded-full border transition-all cursor-pointer ${newTaskAssigneeIds.length === 0 ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
                          >
                            Unassigned
                          </button>
                          {wsTaskTeam.map((member) => member && (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => setNewTaskAssigneeIds((prev) => prev.includes(member.id) ? prev.filter((id) => id !== member.id) : [...prev, member.id])}
                              className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border transition-all cursor-pointer ${newTaskAssigneeIds.includes(member.id) ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                              {member.avatar_url
                                ? <img src={member.avatar_url} alt={member.full_name} className="w-4 h-4 rounded-full object-cover object-top" />
                                : <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">{member.full_name[0]}</div>
                              }
                              <span className={`text-xs font-medium ${newTaskAssigneeIds.includes(member.id) ? 'text-indigo-700' : 'text-gray-600'}`}>{member.full_name.split(' ')[0]}</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                        <input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)}
                          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none min-w-0 flex-1 sm:flex-none" />
                        <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <button onClick={createTask} disabled={!newTaskTitle.trim() || taskSaving}
                          className="px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                          {taskSaving ? '...' : 'Add'}
                        </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Task content */}
                  {wsActiveTasks.length === 0 ? (
                    <div className="py-14 text-center">
                      <i className="ri-task-line text-3xl text-gray-200 block mb-2"></i>
                      <p className="text-sm text-gray-400 mb-3">No tasks yet</p>
                      <button onClick={openNewTask} className="text-sm text-[#FF6B35] hover:underline cursor-pointer">Add the first task</button>
                    </div>
                  ) : wsFilteredTasks.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-gray-400">No tasks in this filter</p>
                    </div>
                  ) : taskView === 'board' ? (
                    <div className="flex p-4 overflow-x-auto overflow-y-hidden min-h-[calc(100vh-19rem)]">
                      <div className="grid grid-cols-5 gap-4 min-w-[1120px] w-full min-h-full">
                        {BOARD_COLUMNS.map((column, columnIdx) => {
                          const columnTasks = wsActiveTasks.filter((task) => task.status === column.key);
                          // Unique per-column sentinel for the top drop zone ('todo' and
                          // 'done' share a key length, so -key.length collided)
                          const topDropSentinel = -(columnIdx + 1);
                          return (
                            <div
                              key={column.key}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setBoardDragOver(column.key);
                              }}
                              onDragLeave={() => setBoardDragOver((current) => (current === column.key ? null : current))}
                              onDrop={async (e) => {
                                e.preventDefault();
                                const taskId = Number(e.dataTransfer.getData('text/task-id') || draggedTaskId);
                                const droppedTask = tasks.find((task) => task.id === taskId);
                                setBoardDragOver(null);
                                setDraggedTaskId(null);
                                if (!droppedTask) return;
                                await updateTaskStatus(droppedTask, column.key);
                              }}
                              className={`rounded-3xl border p-3 transition-colors min-h-full flex flex-col ${
                                boardDragOver === column.key ? 'border-[#FF6B35] bg-orange-50/40' : 'border-gray-100 bg-gray-50/60'
                              }`}
                            >
                              <div className="flex items-center gap-2 px-1 pb-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${column.chip}`}>
                                  <i className={`${column.icon} text-[11px]`}></i>
                                  {column.label}
                                </span>
                                <span className="text-[11px] text-gray-400 font-medium">{columnTasks.length}</span>
                              </div>
                              <div className="space-y-3 min-h-[240px] flex-1 overflow-y-auto pr-1">
                                {columnTasks.length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 px-4 py-6 text-center">
                                    <p className="text-xs text-gray-400">{column.empty}</p>
                                  </div>
                                ) : (
                                  <>
                                  {/* Top drop zone — allows inserting before the first card */}
                                  <div className="h-2 -mb-1 relative"
                                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setListDragOverTaskId(topDropSentinel); setListDragOverPos('above'); setBoardDragOver(null); }}
                                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setListDragOverTaskId(null); setListDragOverPos(null); } }}
                                    onDrop={async e => {
                                      e.preventDefault(); e.stopPropagation();
                                      const fromId = Number(e.dataTransfer.getData('text/task-id') || draggedTaskId);
                                      setListDragOverTaskId(null); setListDragOverPos(null); setDraggedTaskId(null); setBoardDragOver(null);
                                      if (!fromId) return;
                                      const fromTask = tasks.find(t => t.id === fromId);
                                      if (!fromTask) return;
                                      if (fromTask.status !== column.key) {
                                        await updateTaskStatus(fromTask, column.key);
                                        return;
                                      }
                                      const colIds = tasks.filter(t => t.status === column.key && t.id !== fromId).map(t => t.id);
                                      reorderTasks([fromId, ...colIds]);
                                    }}
                                  >
                                    {listDragOverTaskId === topDropSentinel && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#FF6B35] rounded-full pointer-events-none" />}
                                  </div>
                                  {columnTasks.map((task) => {
                                    const isBoardOver = listDragOverTaskId === task.id && draggedTaskId !== task.id;
                                    return (
                                      <div key={task.id} className="relative"
                                        onDragOver={e => { e.preventDefault(); e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setListDragOverTaskId(task.id); setListDragOverPos(e.clientY < r.top + r.height / 2 ? 'above' : 'below'); setBoardDragOver(null); }}
                                        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setListDragOverTaskId(null); setListDragOverPos(null); } }}
                                        onDrop={async e => {
                                          e.preventDefault(); e.stopPropagation();
                                          const fromId = Number(e.dataTransfer.getData('text/task-id') || draggedTaskId);
                                          const r = e.currentTarget.getBoundingClientRect();
                                          const pos = e.clientY < r.top + r.height / 2 ? 'above' : 'below';
                                          setListDragOverTaskId(null); setListDragOverPos(null); setDraggedTaskId(null); setBoardDragOver(null);
                                          if (!fromId || fromId === task.id) return;
                                          const fromTask = tasks.find(t => t.id === fromId);
                                          if (!fromTask) return;
                                          if (fromTask.status !== column.key) {
                                            await updateTaskStatus(fromTask, column.key);
                                            return; // skip reorder — tasks state is stale after async status update
                                          }
                                          // Same-column reorder only
                                          const colIds = tasks.filter(t => t.status === column.key).map(t => t.id);
                                          const withoutFrom = colIds.filter(id => id !== fromId);
                                          const insertAt = withoutFrom.indexOf(task.id) + (pos === 'below' ? 1 : 0);
                                          withoutFrom.splice(insertAt < 0 ? withoutFrom.length : insertAt, 0, fromId);
                                          reorderTasks(withoutFrom);
                                        }}
                                      >
                                        {isBoardOver && listDragOverPos === 'above' && <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-[#FF6B35] rounded-full z-10 pointer-events-none" />}
                                        {isBoardOver && listDragOverPos === 'below' && <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-[#FF6B35] rounded-full z-10 pointer-events-none" />}
                                        {BoardCard(task)}
                                      </div>
                                    );
                                  })}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : taskFilter !== 'all' ? (
                    /* Flat list for specific filter */
                    <div className="p-3 space-y-2">
                      {wsFilteredTasks.map(task => {
                        const sc = wsStatusCycle[task.status];
                        const overdue = wsIsOverdue(task);
                        const priorityBorder = { high: 'border-l-rose-400', medium: 'border-l-amber-400', low: 'border-l-gray-300' }[task.priority];
                        const priorityCfg = PRIORITY_CFG[task.priority];
                        const assignees = getWorkspaceTaskAssignees(task);
                        const isMyTask = getTaskAssigneeIds(task).includes(hubUser?.id ?? '');
                        const commentCount = commentCounts[task.id] ?? 0;
                        const daysLeft = task.due_date
                          ? Math.ceil((new Date(task.due_date + 'T00:00:00').getTime() - new Date(wsToday + 'T00:00:00').getTime()) / 86400000)
                          : null;
                        const isOver = listDragOverTaskId === task.id && draggedTaskId !== task.id;
                        return (
                          <div key={task.id} className="relative">
                            {isOver && listDragOverPos === 'above' && <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#FF6B35] rounded-full z-10 pointer-events-none" />}
                            {isOver && listDragOverPos === 'below' && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#FF6B35] rounded-full z-10 pointer-events-none" />}
                            <div
                              draggable
                              onDragStart={e => { if (!listDragFromHandle.current) { e.preventDefault(); return; } listDragFromHandle.current = false; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/task-id', String(task.id)); setDraggedTaskId(task.id); setListDragOverTaskId(null); setListDragOverPos(null); }}
                              onDragOver={e => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setListDragOverTaskId(task.id); setListDragOverPos(e.clientY < r.top + r.height / 2 ? 'above' : 'below'); }}
                              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setListDragOverTaskId(null); setListDragOverPos(null); } }}
                              onDrop={e => {
                                e.preventDefault();
                                const fromId = Number(e.dataTransfer.getData('text/task-id') || draggedTaskId);
                                const r = e.currentTarget.getBoundingClientRect();
                                const pos = e.clientY < r.top + r.height / 2 ? 'above' : 'below';
                                setListDragOverTaskId(null); setListDragOverPos(null); setDraggedTaskId(null);
                                if (!fromId || fromId === task.id) return;
                                const ids = wsFilteredTasks.map(t => t.id);
                                if (ids.indexOf(fromId) < 0 || ids.indexOf(task.id) < 0) return;
                                const reordered = ids.filter(id => id !== fromId);
                                const insertAt = reordered.indexOf(task.id) + (pos === 'below' ? 1 : 0);
                                reordered.splice(insertAt, 0, fromId);
                                reorderTasks(reordered);
                              }}
                              onDragEnd={() => { listDragFromHandle.current = false; setDraggedTaskId(null); setListDragOverTaskId(null); setListDragOverPos(null); }}
                              onClick={() => openTaskDetail(task)}
                              className={`select-none bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-3.5 border-l-4 group cursor-pointer hover:shadow-md hover:border-gray-200 transition-all ${(task as any).color ? '' : priorityBorder} ${draggedTaskId === task.id ? 'opacity-40' : ''}`}
                              style={(task as any).color ? { borderLeftColor: (task as any).color } : undefined}>
                            <div className="flex items-start gap-2.5">
                              <i className="ri-draggable text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 text-base hidden sm:block" onPointerDown={() => { listDragFromHandle.current = true; }} />
                              <button onClick={e => { e.stopPropagation(); toggleTask(task); }} className={`flex-shrink-0 cursor-pointer mt-0.5 ${sc.cls}`}>
                                <i className={`${sc.icon} text-lg`}></i>
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className={`text-sm font-semibold leading-snug line-clamp-1 sm:line-clamp-none ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                                  {isMyTask && <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#FF6B35]" title="Assigned to you" />}
                                </div>
                                {task.description && <p className="text-xs text-gray-400 mt-0.5 hidden sm:line-clamp-1">{getTaskDescriptionPreview(task.description)}</p>}
                                {task.status === 'blocked' && task.meta?.blocked_reason && <p className="text-[11px] text-rose-600 mt-1 line-clamp-1"><i className="ri-indeterminate-circle-line mr-0.5"></i> Blocked: {task.meta.blocked_reason}</p>}
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 hidden sm:inline ${priorityCfg.cls}`}>{priorityCfg.label}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 pt-0 border-t-0 pl-[26px] sm:pl-0 sm:mt-3 sm:pt-2.5 sm:border-t border-gray-50">
                              {task.due_date && (
                                <div className="flex items-center gap-1">
                                  <i className="ri-calendar-line text-[10px] text-gray-400"></i>
                                  {task.start_date && task.start_date !== task.due_date ? (
                                    <span className="text-[10px] text-gray-500">
                                      {new Date(task.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  ) : (
                                    <span className={`text-[10px] font-medium ${overdue ? 'text-rose-600' : daysLeft === 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                                      {overdue ? `Overdue ${Math.abs(daysLeft!)}d` : daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Tomorrow' : new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                                {commentCount > 0 && (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-semibold">
                                    <i className="ri-chat-3-fill text-[11px]"></i>{commentCount}
                                  </span>
                                )}
                                {assignees.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <div className="flex -space-x-1">
                                      {assignees.slice(0, 3).map((assignee: any) => (
                                        assignee.avatar_url
                                          ? <img key={assignee.id} src={assignee.avatar_url} alt={assignee.full_name} className="w-5 h-5 rounded-full border border-white object-cover object-top" />
                                          : <div key={assignee.id} className="w-5 h-5 rounded-full border border-white bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-500">{assignee.full_name[0]}</div>
                                      ))}
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-medium hidden sm:inline">
                                      {assignees.length === 1 ? assignees[0].full_name.split(' ')[0] : `${assignees.length} assignees`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Grouped sections (taskFilter === 'all') */
                    <div>
                      {(() => {
                        const overdueGroup  = wsFilteredTasks.filter(t => !!wsIsOverdue(t));
                        const inProgGroup   = wsFilteredTasks.filter(t => t.status === 'in_progress' && !wsIsOverdue(t));
                        const reviewGroup   = wsFilteredTasks.filter(t => t.status === 'in_review' && !wsIsOverdue(t));
                        const blockedGroup  = wsFilteredTasks.filter(t => t.status === 'blocked' && !wsIsOverdue(t));
                        const todoGroup     = wsFilteredTasks.filter(t => t.status === 'todo' && !wsIsOverdue(t));
                        const doneGroup     = wsFilteredTasks.filter(t => t.status === 'done');

                        type GroupKey = 'overdue' | 'in_progress' | 'in_review' | 'blocked' | 'todo' | 'done';
                        const groups = [
                          { key: 'overdue' as GroupKey,     label: 'Overdue',     icon: 'ri-alarm-warning-line',         headerCls: 'bg-rose-50/60',    iconCls: 'text-rose-500',    labelCls: 'text-rose-700',    badgeCls: 'bg-rose-100 text-rose-600',    chevronCls: 'text-rose-300',    items: overdueGroup },
                          { key: 'in_progress' as GroupKey, label: 'In Progress', icon: 'ri-loader-2-line',               headerCls: 'bg-sky-50/50',     iconCls: 'text-sky-500',     labelCls: 'text-sky-700',     badgeCls: 'bg-sky-100 text-sky-600',      chevronCls: 'text-sky-400',     items: inProgGroup },
                          { key: 'in_review' as GroupKey,   label: 'In Review',   icon: 'ri-eye-line',                    headerCls: 'bg-purple-50/50',  iconCls: 'text-purple-500',  labelCls: 'text-purple-700',  badgeCls: 'bg-purple-100 text-purple-600', chevronCls: 'text-purple-400', items: reviewGroup },
                          { key: 'blocked' as GroupKey,     label: 'Blocked',     icon: 'ri-indeterminate-circle-line',   headerCls: 'bg-rose-50/50',    iconCls: 'text-rose-500',    labelCls: 'text-rose-700',    badgeCls: 'bg-rose-100 text-rose-600',    chevronCls: 'text-rose-300',    items: blockedGroup },
                          { key: 'todo' as GroupKey,        label: 'To Do',       icon: 'ri-checkbox-blank-circle-line',  headerCls: 'bg-gray-50/60',   iconCls: 'text-gray-400',    labelCls: 'text-gray-600',    badgeCls: 'bg-gray-100 text-gray-500',    chevronCls: 'text-gray-300',    items: todoGroup },
                          { key: 'done' as GroupKey,        label: 'Done',        icon: 'ri-checkbox-circle-fill',        headerCls: 'bg-emerald-50/40', iconCls: 'text-emerald-500', labelCls: 'text-emerald-700', badgeCls: 'bg-emerald-100 text-emerald-600', chevronCls: 'text-emerald-300', items: doneGroup },
                        ];

                        return groups.filter(g => g.items.length > 0).map(g => {
                          const collapsed = !!collapsedGroups[g.key];
                          return (
                            <div key={g.key} className="border-b border-gray-50 last:border-0">
                              <div
                                className={`flex items-center gap-2 px-5 py-2.5 ${g.headerCls} cursor-pointer select-none`}
                                onClick={() => setCollapsedGroups(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
                              >
                                <i className={`${g.icon} ${g.iconCls} text-sm`}></i>
                                <span className={`text-xs font-semibold ${g.labelCls}`}>{g.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${g.badgeCls}`}>{g.items.length}</span>
                                <i className={`${collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'} ${g.chevronCls} ml-auto text-sm`}></i>
                              </div>
                              {!collapsed && (
                                <div className="p-3 space-y-2">
                                  {g.items.map(task => {
                                    const sc = wsStatusCycle[task.status];
                                    const overdue = wsIsOverdue(task);
                                    const priorityBorder = { high: 'border-l-rose-400', medium: 'border-l-amber-400', low: 'border-l-gray-300' }[task.priority];
                                    const priorityCfg = PRIORITY_CFG[task.priority];
                                    const assignees = getWorkspaceTaskAssignees(task);
                                    const commentCount = commentCounts[task.id] ?? 0;
                                    const tDaysLeft = task.due_date
                                      ? Math.ceil((new Date(task.due_date + 'T00:00:00').getTime() - new Date(wsToday + 'T00:00:00').getTime()) / 86400000)
                                      : null;
                                    const isOver2 = listDragOverTaskId === task.id && draggedTaskId !== task.id;
                                    return (
                                      <div key={task.id} className="relative">
                                        {isOver2 && listDragOverPos === 'above' && <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#FF6B35] rounded-full z-10 pointer-events-none" />}
                                        {isOver2 && listDragOverPos === 'below' && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#FF6B35] rounded-full z-10 pointer-events-none" />}
                                        <div
                                        draggable
                                        onDragStart={e => { if (!listDragFromHandle.current) { e.preventDefault(); return; } listDragFromHandle.current = false; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/task-id', String(task.id)); setDraggedTaskId(task.id); setListDragOverTaskId(null); setListDragOverPos(null); }}
                                        onDragOver={e => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setListDragOverTaskId(task.id); setListDragOverPos(e.clientY < r.top + r.height / 2 ? 'above' : 'below'); }}
                                        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setListDragOverTaskId(null); setListDragOverPos(null); } }}
                                        onDrop={e => {
                                          e.preventDefault();
                                          const fromId = Number(e.dataTransfer.getData('text/task-id') || draggedTaskId);
                                          const r = e.currentTarget.getBoundingClientRect();
                                          const pos = e.clientY < r.top + r.height / 2 ? 'above' : 'below';
                                          setListDragOverTaskId(null); setListDragOverPos(null); setDraggedTaskId(null);
                                          if (!fromId || fromId === task.id) return;
                                          const ids = g.items.map(t => t.id);
                                          if (ids.indexOf(fromId) < 0) return;
                                          const reordered = ids.filter(id => id !== fromId);
                                          const insertAt = reordered.indexOf(task.id) + (pos === 'below' ? 1 : 0);
                                          reordered.splice(insertAt, 0, fromId);
                                          reorderTasks(reordered);
                                        }}
                                        onDragEnd={() => { listDragFromHandle.current = false; setDraggedTaskId(null); setListDragOverTaskId(null); setListDragOverPos(null); }}
                                        onClick={() => openTaskDetail(task)}
                                        className={`select-none bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-3.5 border-l-4 group cursor-pointer hover:shadow-md hover:border-gray-200 transition-all ${(task as any).color ? '' : priorityBorder} ${draggedTaskId === task.id ? 'opacity-40' : ''}`}
                                        style={(task as any).color ? { borderLeftColor: (task as any).color } : undefined}>
                                        <div className="flex items-start gap-2.5">
                                          <i className="ri-draggable text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 text-base hidden sm:block" onPointerDown={() => { listDragFromHandle.current = true; }} />
                                          <button onClick={e => { e.stopPropagation(); toggleTask(task); }} className={`flex-shrink-0 cursor-pointer mt-0.5 ${sc.cls}`}>
                                            <i className={`${sc.icon} text-lg`}></i>
                                          </button>
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold leading-snug line-clamp-1 sm:line-clamp-none ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                                            {task.description && <p className="text-xs text-gray-400 mt-0.5 hidden sm:line-clamp-1">{getTaskDescriptionPreview(task.description)}</p>}
                                {task.status === 'blocked' && task.meta?.blocked_reason && <p className="text-[11px] text-rose-600 mt-1 line-clamp-1"><i className="ri-indeterminate-circle-line mr-0.5"></i> Blocked: {task.meta.blocked_reason}</p>}
                                          </div>
                                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 hidden sm:inline ${priorityCfg.cls}`}>{priorityCfg.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 pt-0 border-t-0 pl-[26px] sm:pl-0 sm:mt-3 sm:pt-2.5 sm:border-t border-gray-50">
                                          {task.due_date && (
                                            <div className="flex items-center gap-1">
                                              <i className="ri-calendar-line text-[10px] text-gray-400"></i>
                                              {task.start_date && task.start_date !== task.due_date ? (
                                                <span className="text-[10px] text-gray-500">
                                                  {new Date(task.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                              ) : (
                                                <span className={`text-[10px] font-medium ${overdue ? 'text-rose-600' : tDaysLeft === 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                                                  {overdue ? `Overdue ${Math.abs(tDaysLeft!)}d` : tDaysLeft === 0 ? 'Due today' : tDaysLeft === 1 ? 'Tomorrow' : new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                                            {commentCount > 0 && (
                                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-semibold">
                                                <i className="ri-chat-3-fill text-[11px]"></i>{commentCount}
                                              </span>
                                            )}
                                            {assignees.length > 0 && (
                                              <div className="flex items-center gap-1">
                                                <div className="flex -space-x-1">
                                                  {assignees.slice(0, 3).map((assignee: any) => (
                                                    assignee.avatar_url
                                                      ? <img key={assignee.id} src={assignee.avatar_url} alt={assignee.full_name} className="w-5 h-5 rounded-full border border-white object-cover object-top" />
                                                      : <div key={assignee.id} className="w-5 h-5 rounded-full border border-white bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-500">{assignee.full_name[0]}</div>
                                                  ))}
                                                </div>
                                                <span className="text-[10px] text-gray-500 font-medium hidden sm:inline">
                                                  {assignees.length === 1 ? assignees[0].full_name.split(' ')[0] : `${assignees.length} assignees`}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}

                  {/* Trash — soft-deleted tasks, restorable for 30 days */}
                  {wsTrashedTasks.length > 0 && (
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => setShowTrashedTasks(v => !v)}
                        className="w-full flex items-center gap-2 px-5 py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <i className="ri-delete-bin-line text-sm"></i>
                        <span>{showTrashedTasks ? 'Hide' : 'Show'} trash ({wsTrashedTasks.length})</span>
                        <i className={`${showTrashedTasks ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} ml-auto`}></i>
                      </button>
                      {showTrashedTasks && (
                        <div className="p-3 space-y-2">
                          {wsTrashedTasks.map(task => {
                            const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - new Date(task.deleted_at!).getTime()) / 86400000));
                            return (
                              <div key={task.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-3.5 py-2.5">
                                <i className="ri-delete-bin-line text-gray-300 text-sm flex-shrink-0"></i>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-500 line-clamp-1 line-through">{task.title}</p>
                                  <p className="text-[10px] text-gray-400">Purges in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</p>
                                </div>
                                <button onClick={() => restoreTask(task.id)}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 cursor-pointer transition-colors flex-shrink-0">
                                  <i className="ri-arrow-go-back-line mr-1"></i>Restore
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Archived tasks toggle */}
                  {wsArchivedTasks.length > 0 && (
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => setShowArchivedTasks(v => !v)}
                        className="w-full flex items-center gap-2 px-5 py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <i className="ri-archive-line text-sm"></i>
                        <span>{showArchivedTasks ? 'Hide' : 'Show'} archived ({wsArchivedTasks.length})</span>
                        <i className={`${showArchivedTasks ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} ml-auto`}></i>
                      </button>
                      {showArchivedTasks && (
                        <div className="p-3 space-y-2">
                          {wsArchivedTasks.map(task => (
                            <div key={task.id} onClick={() => openTaskDetail(task)}
                              className="opacity-50 bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 cursor-pointer hover:opacity-70 transition-opacity">
                              <div className="flex items-center gap-2">
                                <i className="ri-archive-line text-gray-400 text-sm flex-shrink-0"></i>
                                <p className="text-sm text-gray-500 line-clamp-1">{task.title}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right sidebar */}
                <div id="ws-sidebar" className={`${taskView === 'board' ? 'hidden' : 'flex'} flex-col gap-4 w-full lg:w-64 flex-shrink-0`}>
                  {/* Dates & Notes card */}
                  {(p.start_date || p.deadline || p.notes) && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    {(p.start_date || p.deadline) && (
                      <div className="space-y-2.5">
                        {p.start_date && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 flex items-center gap-1.5"><i className="ri-play-circle-line text-gray-300"></i>Start</span>
                            <span className="font-medium text-gray-700">{fmtDate(p.start_date)}</span>
                          </div>
                        )}
                        {p.deadline && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 flex items-center gap-1.5"><i className="ri-flag-line text-gray-300"></i>Due</span>
                            <span className={`font-medium ${p.deadline < wsToday && p.status !== 'completed' ? 'text-rose-500' : 'text-gray-700'}`}>
                              {fmtDate(p.deadline)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {p.notes && (
                      <div className={`${(p.start_date || p.deadline) ? 'border-t border-gray-50 pt-3' : ''}`}>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1.5">Notes</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{p.notes}</p>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Team card */}
                  {wsTeam.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Team</p>
                      <div className="space-y-2.5">
                        {wsTeam.map(m => (
                          <div key={m.id} className="flex items-center gap-2.5">
                            {m.avatar_url
                              ? <img src={m.avatar_url} alt={m.full_name} className="w-7 h-7 rounded-full object-cover object-top flex-shrink-0" />
                              : <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">{m.full_name[0]}</div>
                            }
                            <span className="text-sm text-gray-700 truncate">{m.full_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activity card */}
                  {activity.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Activity</p>
                      <div className="space-y-3">
                        {activity.slice(0, 5).map(a => {
                          const diff = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 1000);
                          const time = diff < 60 ? 'just now' : diff < 3600 ? `${Math.floor(diff / 60)}m ago` : diff < 86400 ? `${Math.floor(diff / 3600)}h ago` : new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const actorName = getProjectActivityActorName(a);
                          return (
                            <div key={a.id} className="flex items-start gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-indigo-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-indigo-500 font-bold text-[9px]">{(actorName[0] ?? '?').toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600 leading-snug truncate">{getProjectActivityDescription(a)}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{time}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Questionnaires card */}
                  {wsQuestionnaires.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Questionnaires</p>
                      <div className="space-y-2">
                        {wsQuestionnaires.map(q => (
                          <button key={q.id} onClick={() => setWsQModal(q)}
                            className="w-full text-left rounded-xl border border-gray-100 p-3 hover:border-[#FF6B35]/40 hover:bg-orange-50/40 transition-all cursor-pointer">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-700 truncate">{q.client_name}</p>
                                <p className="text-[11px] text-gray-400 truncate">{q.service_type}</p>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${q.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : q.status === 'sent' ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-500'}`}>
                                {q.status === 'submitted' ? 'Submitted' : q.status === 'sent' ? 'Sent' : 'Draft'}
                              </span>
                            </div>
                            {q.submitted_at && (
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(q.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Finance strip card — client + retainer projects */}
                  {!internalProject && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Financials</p>
                      <div className="space-y-2">
                        {isRetainerProject(p) ? (<>
                          {p.contract_price > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">Setup Fee</span>
                              <span className="font-semibold text-gray-700">{fmt(p.contract_price)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Monthly Rate</span>
                            <span className="font-semibold text-indigo-600">{isOwner ? fmtRate(p.monthly_rate, (p as any).monthly_rate_currency) : 'Retainer'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Total Collected</span>
                            <span className="font-semibold text-emerald-600">{fmt(d.totalPaid)}</span>
                          </div>
                          {d.monthsCollected !== null && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">Months Paid</span>
                              <span className="font-semibold text-gray-700">{d.monthsCollected}</span>
                            </div>
                          )}
                        </>) : (<>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Contract</span>
                            <span className="font-semibold text-gray-700">{fmt(p.contract_price)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Collected</span>
                            <span className="font-semibold text-emerald-600">{fmt(d.totalPaid)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Balance</span>
                            <span className={`font-semibold ${d.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmt(d.balance)}</span>
                          </div>
                        </>)}
                      </div>
                      {!isRetainerProject(p) && <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Collection progress</span>
                          <span>{d.paidPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(d.paidPct, 100)}%` }} />
                        </div>
                      </div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {wsQModal && <QuestionnaireAnswersModal q={wsQModal} onClose={() => setWsQModal(null)} />}

      {!workspaceOpen && (
      <div className="flex items-stretch gap-5 min-h-screen">

        {/* ── Left: projects list ── */}
        <div className="flex-1 min-w-0 space-y-3">

        <section className="space-y-3">

          {/* ── Team Overview hero ── */}
          <div className="relative overflow-hidden rounded-[28px] p-6 sm:p-7 text-white shadow-[0_20px_50px_-20px_rgba(28,43,58,0.55)]" style={{ background: 'linear-gradient(135deg, #1c2b3a 0%, #2d4a6e 100%)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(480px 300px at 88% -10%, rgba(255,255,255,0.16), transparent 60%)' }}></div>
            <div className="relative flex items-center justify-between gap-6 flex-wrap">
              <div>
                <p className="text-xs text-white/55 font-medium mb-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <h2 className="text-2xl font-extrabold tracking-tight leading-tight">Team Overview</h2>
                <p className="text-sm text-white/70 mt-1">
                  {heroActiveProjectsCount} active project{heroActiveProjectsCount !== 1 ? 's' : ''} · {heroOpenTasks.length} open task{heroOpenTasks.length !== 1 ? 's' : ''} across the team
                </p>
              </div>
              {allTasks.length > 0 && (
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="relative w-[72px] h-[72px] flex-shrink-0">
                    <svg width="72" height="72" className="-rotate-90">
                      <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="7" />
                      <circle cx="36" cy="36" r="30" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 30} strokeDashoffset={2 * Math.PI * 30 * (1 - heroPct / 100)} style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-base font-bold">{heroPct}%</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-white/80"><span className="w-1.5 h-1.5 rounded-full bg-amber-300 flex-shrink-0"></span>{heroDueLabel} <span className="font-bold text-white">{heroDueInWindowCount}</span></div>
                    <div className="flex items-center gap-2 text-xs text-white/80"><span className="w-1.5 h-1.5 rounded-full bg-rose-300 flex-shrink-0"></span>Overdue <span className="font-bold text-white">{heroOverdueCount}</span></div>
                    <div className="flex items-center gap-2 text-xs text-white/80"><span className="w-1.5 h-1.5 rounded-full bg-emerald-300 flex-shrink-0"></span>Done <span className="font-bold text-white">{heroDoneInWindow.length}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Tab switcher ── */}
          <div className="flex items-center gap-3">
            <div className="relative inline-grid grid-cols-3 bg-gray-100 rounded-2xl p-1 flex-shrink-0">
              <div className="absolute top-1 bottom-1 left-1 w-[calc(33.333%-4px)] bg-white rounded-xl shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: pageView === 'tasks' ? 'translateX(100%)' : pageView === 'team' ? 'translateX(200%)' : 'translateX(0)' }}></div>
              <button onClick={() => setPageView('projects')}
                className={`relative z-10 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${pageView === 'projects' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <i className="ri-folder-line text-sm"></i><span className="hidden sm:inline">Projects</span>
              </button>
              <button onClick={() => { setPageView('tasks'); fetchAllTasks(); }}
                className={`relative z-10 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${pageView === 'tasks' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <i className="ri-task-line text-sm"></i><span className="hidden sm:inline">Tasks</span>
              </button>
              <button onClick={() => { setPageView('team'); fetchAllTasks(); }}
                className={`relative z-10 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${pageView === 'team' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <i className="ri-group-line text-sm"></i><span className="hidden sm:inline">Team</span>
              </button>
            </div>
            <div className="flex-1" />
            {pageView === 'projects' && (
              <>
                <div className="relative group/more flex-shrink-0">
                  <button className="flex items-center justify-center w-8 h-8 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">
                    <i className="ri-more-line text-sm"></i>
                  </button>
                  <div className="absolute right-0 top-9 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[160px] hidden group-hover/more:block">
                    <div className="px-3 py-1.5 border-b border-gray-50">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Filter by</p>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      <select value={projectTypeFilter} onChange={e => setProjectTypeFilter(e.target.value as any)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none cursor-pointer">
                        <option value="all">All Types</option>
                        <option value="client">Fixed Contract</option>
                        <option value="internal">Internal</option>
                      </select>
                      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none cursor-pointer">
                        <option value="all">All Services</option>
                        {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="border-t border-gray-50 pt-1">
                      <button onClick={() => { setEditingProject(null); setForm({ ...emptyForm, project_type: 'retainer' }); setShowForm(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                        <i className="ri-add-line text-sm"></i>Add Client
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setEditingProject(null); setForm(emptyForm); setShowForm(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] text-white text-xs font-medium rounded-xl hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0">
                  <i className="ri-add-line text-sm"></i>New Project
                </button>
              </>
            )}
            {pageView === 'team' && (
              <div className="inline-flex items-center gap-1 bg-white/50 backdrop-blur-sm border border-white/80 rounded-xl p-1 flex-shrink-0">
                {([['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']] as const).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setTeamWindow(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${teamWindow === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Sub-filter: status ── */}
          {pageView === 'projects' && (
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-0">
              <div className="flex items-center gap-6 overflow-x-auto">
                {statusTabs.filter(t => t.key !== 'all').map(tab => (
                  <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                    className={`relative pb-[11px] text-[13px] transition-colors cursor-pointer whitespace-nowrap ${statusFilter === tab.key ? 'text-gray-900 font-bold' : 'text-gray-400 font-semibold hover:text-gray-600'}`}>
                    {tab.label}
                    {statusFilter === tab.key && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-[#1c2b3a]"></span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pageView === 'team' && (() => {
            const cards = contractors.map(c => {
              const personTasks = allTasks.filter((t: any) => t.status !== 'done' && !t.archived && getTaskAssigneeIds(t).includes(c.id));
              // pastDue drives list membership so a blocked past-due task still
              // shows up; overdueCount drives the red badge and excludes blocked.
              const pastDue = personTasks.filter((t: any) => t.due_date && t.due_date < teamToday);
              const overdueCount = pastDue.filter((t: any) => isTaskOverdue(t, teamToday)).length;
              const inWindow = personTasks.filter((t: any) => {
                if (!t.due_date || t.due_date < teamToday) return false;
                const d = daysOut(t);
                return d !== null && d <= windowDays;
              });
              const noDueDate = windowDays >= 30 ? personTasks.filter((t: any) => !t.due_date) : [];
              const shown = [...pastDue.slice(0, 2), ...inWindow, ...noDueDate].slice(0, 4);
              const windowOpen = pastDue.length + inWindow.length + noDueDate.length;
              const allPersonTasks = allTasks.filter((t: any) => getTaskAssigneeIds(t).includes(c.id));
              const doneCount = doneInWindow(allPersonTasks).length;
              return { contractor: c, shown, overdueCount, totalOpen: personTasks.length, windowOpen, doneCount };
            }).sort((a, b) => (b.overdueCount - a.overdueCount) || (b.shown.length - a.shown.length));

            const bucketStats = (bucketTasks: any[]) => {
              const openTasks = bucketTasks.filter((t: any) => t.status !== 'done' && !t.archived);
              const pastDue = openTasks.filter((t: any) => t.due_date && t.due_date < teamToday);
              const inWindow = openTasks.filter((t: any) => {
                if (!t.due_date || t.due_date < teamToday) return false;
                const d = daysOut(t);
                return d !== null && d <= windowDays;
              });
              const noDueDate = windowDays >= 30 ? openTasks.filter((t: any) => !t.due_date) : [];
              return {
                windowOpen: pastDue.length + inWindow.length + noDueDate.length,
                overdueCount: pastDue.filter((t: any) => isTaskOverdue(t, teamToday)).length,
                doneCount: doneInWindow(bucketTasks).length,
              };
            };

            const unassignedTasks = allTasks.filter((t: any) => getTaskAssigneeIds(t).length === 0);
            const unassignedStats = bucketStats(unassignedTasks);

            const contractorIds = new Set(contractors.map(c => c.id));
            const orphanedByAssignee = new Map<string, { id: string; name: string; avatar_url: string | null; tasks: any[] }>();
            allTasks.forEach((t: any) => {
              getTaskAssigneeIds(t).forEach((id: string) => {
                if (contractorIds.has(id)) return;
                const u = (t.assignees ?? []).find((a: any) => a.id === id);
                if (!orphanedByAssignee.has(id)) {
                  orphanedByAssignee.set(id, { id, name: u?.full_name ? `${u.full_name} (inactive)` : 'Unknown user', avatar_url: u?.avatar_url ?? null, tasks: [] });
                }
                orphanedByAssignee.get(id)!.tasks.push(t);
              });
            });
            const orphanedEntries = [...orphanedByAssignee.values()].map(({ id, name, avatar_url, tasks }) => ({ id, name, avatar_url, ...bucketStats(tasks) }));

            const workload = [
              ...cards.map(({ contractor: c, windowOpen, overdueCount, doneCount }) => ({ id: c.id, name: c.full_name, avatar_url: c.avatar_url, totalOpen: windowOpen, overdueCount, doneCount })),
              ...((unassignedStats.windowOpen > 0 || unassignedStats.doneCount > 0) ? [{ id: '__unassigned', name: 'Unassigned', avatar_url: null, totalOpen: unassignedStats.windowOpen, overdueCount: unassignedStats.overdueCount, doneCount: unassignedStats.doneCount }] : []),
              ...orphanedEntries.filter(e => e.windowOpen > 0 || e.doneCount > 0).map(({ windowOpen, ...rest }) => ({ ...rest, totalOpen: windowOpen })),
            ].sort((a, b) => (b.totalOpen - a.totalOpen) || (b.doneCount - a.doneCount));
            const maxOpen = Math.max(1, ...workload.map(w => w.totalOpen));

            const assignableProjects = projects.filter(p => p.status !== 'cancelled');

            return (
              <div className="pt-1 pb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cards.map(({ contractor: c, shown, overdueCount }) => (
                    <div key={c.id} className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/80 p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt={c.full_name} className="w-11 h-11 rounded-full object-cover object-top flex-shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#1c2b3a]/70 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{c.full_name[0]}</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{c.full_name}</p>
                          <p className="text-[11px] text-gray-400 truncate">{c.department || 'Team'}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                          {overdueCount > 0 && (
                            <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">{overdueCount} overdue</span>
                          )}
                          <button type="button" title={`Assign a task to ${c.full_name.split(' ')[0]}`}
                            onClick={() => {
                              setQuickAddFor(quickAddFor === c.id ? null : c.id);
                              setQuickAddTitle(''); setQuickAddDueDate('');
                              setQuickAddProjectId(assignableProjects[0]?.id ?? null);
                            }}
                            className={`w-6 h-6 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${quickAddFor === c.id ? 'bg-[#1c2b3a] text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
                            <i className="ri-add-line text-sm"></i>
                          </button>
                        </div>
                      </div>
                      {quickAddFor === c.id && (
                        <div className="flex flex-col gap-1.5 bg-gray-50/80 rounded-xl p-2.5">
                          <input autoFocus value={quickAddTitle} onChange={e => setQuickAddTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') void quickAddTask(c.id); if (e.key === 'Escape') setQuickAddFor(null); }}
                            placeholder="Task title..."
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1c2b3a]/30 focus:border-[#1c2b3a]" />
                          <div className="flex items-center gap-1.5">
                            <select value={quickAddProjectId ?? ''} onChange={e => setQuickAddProjectId(Number(e.target.value))}
                              className="flex-1 min-w-0 px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                              {assignableProjects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                            </select>
                            <input type="date" value={quickAddDueDate} onChange={e => setQuickAddDueDate(e.target.value)}
                              className="px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer" />
                          </div>
                          <div className="flex items-center justify-end gap-1.5 pt-0.5">
                            <button type="button" onClick={() => setQuickAddFor(null)} className="px-2.5 py-1 text-[11px] text-gray-500 hover:text-gray-700 cursor-pointer">Cancel</button>
                            <button type="button" disabled={!quickAddTitle.trim() || !quickAddProjectId || quickAddSaving} onClick={() => void quickAddTask(c.id)}
                              className="px-3 py-1 text-[11px] font-semibold bg-[#1c2b3a] text-white rounded-lg disabled:opacity-40 cursor-pointer">
                              {quickAddSaving ? 'Adding...' : 'Add'}
                            </button>
                          </div>
                        </div>
                      )}
                      {shown.length === 0 ? (
                        <div className="flex items-center gap-2 py-2">
                          <i className="ri-checkbox-circle-line text-emerald-400 text-base"></i>
                          <p className="text-xs text-gray-400">All caught up</p>
                        </div>
                      ) : (
                        <div className="space-y-1 -mx-1">
                          {shown.slice(0, 4).map((t: any) => {
                            const isOverdueTask = isTaskOverdue(t, teamToday);
                            return (
                              <button key={t.id} type="button" onClick={() => openTaskDetail(t)}
                                className="w-full flex items-center gap-2 px-1 py-1.5 rounded-xl hover:bg-gray-50/80 transition-colors text-left cursor-pointer">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOverdueTask ? 'bg-rose-400' : 'bg-sky-400'}`}></span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 truncate">{t.title}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{t.project?.project_name ?? 'Unknown'}</p>
                                </div>
                                {t.due_date && (
                                  <span className={`text-[10px] font-semibold flex-shrink-0 ${isOverdueTask ? 'text-rose-500' : t.due_date === teamToday ? 'text-amber-600' : 'text-gray-400'}`}>
                                    {t.due_date === teamToday ? 'Today' : isOverdueTask ? 'Late' : new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {shown.length > 4 && <p className="text-[10px] text-gray-400 px-1 pt-1">+{shown.length - 4} more</p>}
                        </div>
                      )}
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="col-span-full text-center py-14">
                      <p className="text-sm text-gray-400">No team members yet.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {pageView === 'tasks' && (
            <div className="space-y-4 pt-1 pb-3">
              {/* ── Filters ── */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[160px]">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                  <input value={taskSearch} onChange={e => setTaskSearch(e.target.value)} placeholder="Search tasks..."
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <select value={taskStatusFilter} onChange={e => setTaskStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none cursor-pointer">
                  <option value="active">Active</option><option value="all">All</option><option value="overdue">Overdue</option>
                  <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option>
                </select>
                <select value={taskGroupBy} onChange={e => setTaskGroupBy(e.target.value as 'project' | 'assignee')} className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none cursor-pointer">
                  <option value="project">By Project</option><option value="assignee">By Assignee</option>
                </select>
              </div>
              {allTasksLoading ? (
                <div className="flex justify-center py-16"><i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i></div>
              ) : (() => {
                const tod = localToday();
                const isOver = (t: any) => t.due_date && t.due_date < tod && t.status !== 'done';
                const filt = allTasks.filter(t => {
                  if (taskSearch && !t.title.toLowerCase().includes(taskSearch.toLowerCase()) && !t.project?.project_name?.toLowerCase().includes(taskSearch.toLowerCase())) return false;
                  if (taskStatusFilter === 'active') return t.status !== 'done';
                  if (taskStatusFilter === 'overdue') return isOver(t);
                  if (taskStatusFilter !== 'all') return t.status === taskStatusFilter;
                  return true;
                });
                const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
                  todo: { label: 'To Do', cls: 'bg-gray-100 text-gray-600' },
                  in_progress: { label: 'In Progress', cls: 'bg-sky-100 text-sky-700' },
                  in_review: { label: 'In Review', cls: 'bg-violet-100 text-violet-700' },
                  blocked: { label: 'Blocked', cls: 'bg-rose-100 text-rose-700' },
                  done: { label: 'Done', cls: 'bg-emerald-100 text-emerald-700' },
                };
                const groups: Record<string, any[]> = {};
                for (const t of filt) {
                  const key = taskGroupBy === 'project' ? (t.project?.project_name ?? 'Unknown') : (t.assignee?.full_name ?? 'Unassigned');
                  (groups[key] ??= []).push(t);
                }
                // Workload strip: open/overdue per person across every project
                const workload: Record<string, { name: string; avatar: string | null; open: number; overdue: number }> = {};
                for (const t of allTasks) {
                  if (t.status === 'done') continue;
                  const people = t.assignees ?? [];
                  for (const u of people) {
                    if (!u?.id) continue;
                    const key = u.id;
                    workload[key] ??= { name: u.full_name, avatar: u.avatar_url ?? null, open: 0, overdue: 0 };
                    workload[key].open++;
                    if (isOver(t)) workload[key].overdue++;
                  }
                }
                const workloadRows = Object.entries(workload).sort((a, b) => b[1].open - a[1].open);
                const maxOpen = Math.max(1, ...workloadRows.map(([, w]) => w.open));
                const workloadStrip = workloadRows.length > 1 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Team Workload</p>
                    <div className="space-y-2">
                      {workloadRows.map(([key, w]) => (
                        <div key={key} className="flex items-center gap-3">
                          {w.avatar
                            ? <img src={w.avatar} alt={w.name} className="w-6 h-6 rounded-full object-cover object-top flex-shrink-0" />
                            : <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0">{w.name[0]}</div>}
                          <span className="text-xs text-gray-700 w-32 truncate flex-shrink-0">{w.name.split(' ')[0]}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${w.overdue > 0 ? 'bg-rose-400' : 'bg-sky-400'}`} style={{ width: `${Math.round((w.open / maxOpen) * 100)}%` }} />
                          </div>
                          <span className="text-[11px] text-gray-500 w-32 text-right flex-shrink-0 whitespace-nowrap">
                            {w.open} open{w.overdue > 0 && <span className="text-rose-500 font-semibold"> · {w.overdue} late</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
                const groupSections = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).map(([grp, gtasks]) => {
                  const done = gtasks.filter(t => t.status === 'done').length;
                  const pct = Math.round((done / gtasks.length) * 100);
                  const overdue = gtasks.filter(t => isOver(t)).length;
                  return (
                    <div key={grp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[#FF6B35] flex-shrink-0"></span>
                          <h3 className="font-semibold text-sm text-gray-800 truncate">{grp}</h3>
                          <span className="text-xs text-gray-400 flex-shrink-0">{gtasks.length}</span>
                          {overdue > 0 && <span className="text-[10px] text-rose-500 font-medium flex-shrink-0">{overdue} overdue</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                          <span className="text-xs text-gray-400">{done}/{gtasks.length}</span>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {gtasks.map(t => {
                          const over = isOver(t);
                          const scfg = STATUS_LABEL[t.status] ?? STATUS_LABEL.todo;
                          return (
                            <div key={t.id} onClick={() => openTaskDetail(t as unknown as ProjectTask)} className={`flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/60 cursor-pointer ${over ? 'bg-rose-50/30' : ''}`}>
                              <button onClick={async (e) => { e.stopPropagation(); const n = t.status === 'done' ? 'todo' : 'done'; await supabase.from('hub_project_tasks').update({ status: n, completed_at: n === 'done' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', t.id); setAllTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: n } : x)); logStatusChangeSideEffects(t, n); }} className="flex-shrink-0 cursor-pointer">
                                <i className={`text-base ${t.status === 'done' ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-checkbox-blank-circle-line text-gray-300 hover:text-emerald-400'}`}></i>
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</p>
                                {taskGroupBy === 'assignee' && t.project && <p className="text-[11px] text-gray-400 truncate">{t.project.project_name}</p>}
                              </div>
                              <span className={`hidden sm:block text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${scfg.cls}`}>{scfg.label}</span>
                              {t.due_date && <span className={`text-[11px] font-medium flex-shrink-0 ${over ? 'text-rose-500' : 'text-gray-400'}`}>{new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                              {t.assignee && taskGroupBy === 'project' && (
                                t.assignee.avatar_url
                                  ? <img src={t.assignee.avatar_url} alt={t.assignee.full_name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                                  : <div className="w-6 h-6 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0 text-white text-[9px] font-bold">{t.assignee.full_name[0]}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
                return <>{workloadStrip}{groupSections}</>;
              })()}
            </div>
          )}
          <div className="pb-3" style={{ display: pageView !== 'projects' ? 'none' : undefined }}>
            {loading ? (
              <div className="flex justify-center py-16"><i className="ri-loader-4-line animate-spin text-gray-300 text-2xl"></i></div>
            ) : (
              <div className="space-y-6">

                {/* ── Projects, grouped by stage ── */}
                {filtered.length > 0 && (() => {
                  const stageGroups = STAGES
                    .map(stage => ({ stage, rows: filtered.filter(p => (p.stage ?? DEFAULT_STAGE) === stage) }))
                    .filter(g => g.rows.length > 0);
                  return (
                    <>
                      {stageGroups.map(({ stage, rows }) => (
                        <div key={stage}>
                          <div className="flex items-center gap-2 mb-3">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{stage.toUpperCase()} <span className="text-gray-300 font-normal">({rows.length})</span></p>
                          </div>
                          <div className="rounded-3xl bg-white/70 backdrop-blur-sm border border-white/80 divide-y divide-gray-100/80 overflow-hidden">
                            {rows.map(p => renderProjectRow(p))}
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}

                {filtered.length === 0 && !loading && (
                  <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-14 text-center">
                    <p className="text-sm text-gray-400">No projects match this filter.</p>
                  </div>
                )}

                {/* ── Retainer Clients ── */}
                {!activeClientId && (() => {
                  const retainerNames = new Set([
                    ...retainerProjects.map(p => p.client_name.toLowerCase()),
                    ...retainerProjects.map(p => p.project_name.toLowerCase()),
                  ]);
                  const extraIntl = intlClients.filter(c => !retainerNames.has(c.client_name.toLowerCase()));
                  const visibleRetainers = [...retainerProjects]
                    .filter(p => statusFilter === 'archived'
                      ? isArchivedProject(p)
                      : !isArchivedProject(p) && (statusFilter === 'all' || p.status === statusFilter))
                    .sort((a, b) => a.project_name.localeCompare(b.project_name));
                  const licenseClients = visibleRetainers.filter(isLicenseProject);
                  const sortedRetainers = visibleRetainers.filter(p => !isLicenseProject(p));
                  const sortedIntl = [...extraIntl].sort((a, b) => a.client_name.localeCompare(b.client_name));
                  const totalCount = sortedRetainers.length + sortedIntl.length;
                  if (totalCount === 0 && licenseClients.length === 0) return null;
                  return (
                    <>
                    {totalCount > 0 && <div>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Retainer Clients</p>
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{totalCount}</span>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                        {sortedRetainers.map(p => {
                          const pal = getServicePalette(p.service);
                          const team = p.hub_project_contractors.map((pc: any) => pc.hub_users).filter(Boolean);
                          const isSelected = activeId === p.id;
                          return (
                            <div key={p.id} role="button" tabIndex={0}
                              onClick={() => openProjectWorkspace(p.id)}
                              onKeyDown={e => { if (e.key === 'Enter') openProjectWorkspace(p.id); }}
                              className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all group cursor-pointer ${isSelected ? 'bg-[#FF6B35]/5' : 'hover:bg-gray-50/60'}`}>
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                                style={{ background: `linear-gradient(135deg, ${pal.from}, ${pal.to})` }}>
                                <span className="text-[13px] font-bold text-white">{p.project_name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[14px] font-semibold text-[#111827] truncate leading-snug">{p.project_name}</p>
                                  {p.stage && getStageCfg(p.stage) && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getStageCfg(p.stage)!.cls}`}>{p.stage}</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{p.client_name}{p.service ? ` · ${p.service}` : ''}</p>
                              </div>
                              <div className="hidden sm:flex -space-x-2 flex-shrink-0">
                                {team.slice(0, 4).map((u: any, i: number) => (
                                  u?.avatar_url
                                    ? <img key={i} src={u.avatar_url} alt={u.full_name} className="w-7 h-7 rounded-full object-cover object-top border-2 border-white shadow-sm" />
                                    : <div key={i} className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-gray-500">{u?.full_name?.[0]}</div>
                                ))}
                                {team.length === 0 && <div className="w-7 h-7 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center"><i className="ri-user-line text-[9px] text-gray-300"></i></div>}
                              </div>
                              {((p as any).monthly_deliverables ?? 0) > 0 && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${(deliveredThisMonth[p.id] ?? 0) >= (p as any).monthly_deliverables ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-50 text-[#FF6B35]'}`}>
                                  {deliveredThisMonth[p.id] ?? 0}/{(p as any).monthly_deliverables} this month
                                </span>
                              )}
                              {isOwner && p.monthly_rate ? (
                                <span className="text-xs font-semibold text-gray-700 tabular-nums flex-shrink-0">{fmtRate(p.monthly_rate, (p as any).monthly_rate_currency)}</span>
                              ) : (
                                <span className="text-[11px] text-gray-400 flex-shrink-0">Retainer</span>
                              )}
                              <button
                                onClick={e => { e.stopPropagation(); setActiveClientId(null); setActiveId(p.id); }}
                                title="Payments, payouts & contract"
                                className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 cursor-pointer transition-colors ${isSelected ? 'text-[#FF6B35] bg-[#FF6B35]/10' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}>
                                <i className="ri-wallet-3-line text-base"></i>
                              </button>
                              <i className="ri-arrow-right-s-line text-gray-300 group-hover:text-gray-500 transition-colors text-lg flex-shrink-0" />
                            </div>
                          );
                        })}
                        {sortedIntl.map(c => {
                          const pal = getServicePalette(c.platform);
                          return (
                            <button key={c.id} onClick={() => openClientWorkspace(c)} disabled={openingWorkspace}
                              className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all group cursor-pointer hover:bg-gray-50/60">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                                style={{ background: `linear-gradient(135deg, ${pal.from}, ${pal.to})` }}>
                                <span className="text-[13px] font-bold text-white">{c.client_name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold text-[#111827] truncate leading-snug">{c.client_name}</p>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{c.platform ?? 'Client'}{c.notes ? ` · ${c.notes}` : ''}</p>
                              </div>
                              <div className="hidden sm:flex -space-x-2 flex-shrink-0">
                                {c.assignments.slice(0, 4).map((a, i) => (
                                  a.hub_users?.avatar_url
                                    ? <img key={i} src={a.hub_users.avatar_url} alt={a.hub_users.full_name} className="w-7 h-7 rounded-full object-cover object-top border-2 border-white shadow-sm" />
                                    : <div key={i} className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-gray-500">{a.hub_users?.full_name?.[0]}</div>
                                ))}
                              </div>
                              <span className="text-[11px] text-gray-400 capitalize flex-shrink-0">{c.status}</span>
                              <i className="ri-arrow-right-s-line text-gray-300 group-hover:text-gray-500 transition-colors text-lg flex-shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>}

                    {/* ── Sentro Hub Clients — license instances, billing only ── */}
                    {licenseClients.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Sentro Hub Clients</p>
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{licenseClients.length}</span>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                          {licenseClients.map(p => {
                            const isSelected = activeId === p.id;
                            const totalPaid = p.hub_project_payments.reduce((s: number, x: any) => s + x.amount, 0);
                            return (
                              <div key={p.id} role="button" tabIndex={0}
                                onClick={() => { setActiveClientId(null); setActiveId(p.id); }}
                                onKeyDown={e => { if (e.key === 'Enter') { setActiveClientId(null); setActiveId(p.id); } }}
                                className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all group cursor-pointer ${isSelected ? 'bg-[#FF6B35]/5' : 'hover:bg-gray-50/60'}`}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm bg-[#FF6B35]">
                                  <img src="/s-logo.png" alt="S" className="w-5 h-5 object-contain" style={{ filter: 'invert(1)' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14px] font-semibold text-[#111827] truncate leading-snug">{p.client_name}</p>
                                  <p className="text-xs text-gray-400 truncate mt-0.5">Sentro Hub License{p.start_date ? ` · since ${fmtDate(p.start_date)}` : ''}</p>
                                </div>
                                {isOwner && <>
                                  {totalPaid > 0 && (
                                    <span className="text-[11px] text-emerald-600 font-medium flex-shrink-0 hidden sm:inline">{fmt(totalPaid)} collected</span>
                                  )}
                                  {p.monthly_rate ? (
                                    <span className="text-xs font-semibold text-gray-700 tabular-nums flex-shrink-0">{fmtRate(p.monthly_rate, (p as any).monthly_rate_currency)}</span>
                                  ) : null}
                                </>}
                                <i className="ri-arrow-right-s-line text-gray-300 group-hover:text-gray-500 transition-colors text-lg flex-shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </>
                  );
                })()}

              </div>
            )}
          </div>
        </section>


        <div ref={detailPanelRef} />
        {activeProject ? (() => {
          const d = derived(activeProject);
          const cfg = statusCfg[activeProject.status] ?? statusCfg.ongoing;
          const unassigned = contractors.filter(c => !activeProject.hub_project_contractors.some(pc => pc.hub_users?.id === c.id));
          const internalProject = isInternalProject(activeProject);

          return (
            <>
              {/* Mobile: bottom sheet overlay */}
              <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setActiveId(null)} />
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 sticky top-0 bg-white">
                  <div>
                    <p className="font-semibold text-[#111827] text-sm">{activeProject.project_name}</p>
                    <p className="text-xs text-gray-400">{internalProject ? 'Internal Project' : activeProject.client_name}</p>
                  </div>
                  <button onClick={() => setActiveId(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 cursor-pointer">
                    <i className="ri-close-line"></i>
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    {(internalProject ? [
                      { label: 'Team', value: String(activeProject.hub_project_contractors.length), cls: 'text-gray-800' },
                      { label: 'Tasks', value: String(tasks.length), cls: 'text-indigo-600' },
                      { label: 'Done', value: String(tasks.filter(t => t.status === 'done').length), cls: 'text-emerald-600' },
                      { label: 'Status', value: cfg.label, cls: 'text-gray-500' },
                    ] : isRetainerProject(activeProject) ? [
                      ...(isOwner ? [
                        ...(activeProject.contract_price > 0 ? [{ label: 'Setup Fee', value: fmt(activeProject.contract_price), cls: 'text-gray-800' }] : []),
                        { label: 'Monthly', value: fmtRate(activeProject.monthly_rate, (activeProject as any).monthly_rate_currency), cls: 'text-indigo-600' },
                        { label: 'Collected', value: fmt(d.totalPaid), cls: 'text-emerald-600' },
                        { label: 'Months Paid', value: String(d.monthsCollected ?? '—'), cls: 'text-gray-700' },
                        { label: 'Costs', value: fmt(d.totalCosts), cls: 'text-orange-600' },
                      ] : [
                        { label: 'Team', value: String(activeProject.hub_project_contractors.length), cls: 'text-gray-800' },
                        { label: 'Tasks', value: String(tasks.length), cls: 'text-indigo-600' },
                        { label: 'Done', value: String(tasks.filter(t => t.status === 'done').length), cls: 'text-emerald-600' },
                        { label: 'Status', value: cfg.label, cls: 'text-gray-500' },
                      ]),
                    ] : [
                      { label: 'Contract', value: fmt(activeProject.contract_price), cls: 'text-gray-800' },
                      { label: 'Paid', value: fmt(d.totalPaid), cls: 'text-emerald-600' },
                      { label: 'Balance', value: fmt(d.balance), cls: d.balance > 0 ? 'text-rose-600' : 'text-gray-400' },
                      { label: 'Costs', value: fmt(d.totalCosts), cls: 'text-orange-600' },
                    ]).map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                        <p className={`text-sm font-bold mt-0.5 ${s.cls}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Actions */}
                  {!isLicenseProject(activeProject) && <button onClick={() => { setWorkspaceOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl cursor-pointer">
                    <i className="ri-layout-grid-line"></i> Open Workspace
                  </button>}
                  <div className="flex gap-2">
                    {!internalProject && <button onClick={() => navigate(`/hub/admin/invoices/${activeProject.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#111827] text-white text-sm rounded-xl cursor-pointer">
                      <i className="ri-mail-send-line"></i> Send Invoice
                    </button>}
                    <button onClick={() => { setEditingProject(activeProject); setForm({ project_type: activeProject.project_type, project_name: activeProject.project_name, client_name: activeProject.client_name, contact_email: activeProject.contact_email ?? '', service: activeProject.service ?? '', contract_price: activeProject.project_type === 'internal' ? '' : String(activeProject.contract_price || ''), monthly_rate: activeProject.monthly_rate != null ? String(activeProject.monthly_rate) : '', monthly_deliverables: (activeProject as any).monthly_deliverables != null ? String((activeProject as any).monthly_deliverables) : '', monthly_rate_currency: (activeProject as any).monthly_rate_currency ?? 'PHP', deadline: activeProject.deadline ?? '', start_date: activeProject.start_date ?? '', status: activeProject.status, stage: activeProject.stage ?? DEFAULT_STAGE, notes: activeProject.notes ?? '', drive_url: (activeProject as any).drive_url ?? '' } as any); setShowForm(true); }}
                      className="px-4 flex items-center gap-1.5 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl cursor-pointer">
                      <i className="ri-edit-line"></i>
                    </button>
                    <button onClick={() => void deleteProject(activeProject)} className="px-4 flex items-center gap-1.5 py-2.5 border border-rose-200 text-rose-500 text-sm rounded-xl cursor-pointer">
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </div>
                  {/* Team */}
                  {!isLicenseProject(activeProject) && activeProject.hub_project_contractors.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Team</p>
                      <div className="space-y-2">
                        {activeProject.hub_project_contractors.map((pc: any) => (
                          <div key={pc.hub_users?.id} className="flex items-center gap-2.5">
                            {pc.hub_users?.avatar_url
                              ? <img src={pc.hub_users.avatar_url} alt={pc.hub_users.full_name} className="w-7 h-7 rounded-full object-cover object-top" />
                              : <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">{pc.hub_users?.full_name?.[0]}</div>
                            }
                            <div>
                              <p className="text-sm text-[#111827]">{pc.hub_users?.full_name}</p>
                              <p className="text-xs text-gray-400">{pc.hub_users?.department}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Payments */}
                  {!internalProject && activeProject.hub_project_payments.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Payments</p>
                      <div className="space-y-1.5">
                        {activeProject.hub_project_payments.map((pay: any) => (
                          <div key={pay.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{fmtDate(pay.paid_at)}</span>
                            <span className="font-medium text-emerald-600">{fmt(pay.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop: right-side drawer */}
            <div className="hidden lg:block fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setActiveId(null)} />
            <div className="hidden lg:block fixed right-0 top-0 bottom-0 z-50 w-[620px] max-w-[92vw] bg-gray-50 shadow-2xl overflow-y-auto p-5 space-y-4">
              {/* Header */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-[#111827] text-lg leading-snug">{activeProject.project_name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                      {internalProject && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">Internal</span>
                      )}
                      {activeProject.service && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getServiceCfg(activeProject.service).badge}`}>{activeProject.service}</span>
                      )}
                      {activeProject.stage && getStageCfg(activeProject.stage) && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageCfg(activeProject.stage)!.cls}`}>{activeProject.stage}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{internalProject ? 'Internal Project' : activeProject.client_name}</p>
                    {(activeProject.start_date || activeProject.deadline) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {activeProject.start_date && `Started ${fmtDate(activeProject.start_date)}`}
                        {activeProject.start_date && activeProject.deadline && ' · '}
                        {activeProject.deadline && `Due ${fmtDate(activeProject.deadline)}`}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setActiveId(null)} title="Close details"
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors flex-shrink-0">
                    <i className="ri-close-line text-base"></i>
                  </button>
                </div>

                {/* Actions — own row so the title never gets squeezed */}
                <div className="flex items-center gap-1.5 flex-wrap mt-4 pt-3 border-t border-gray-50">
                    {/* Secondary actions */}
                    <div className="flex items-center gap-0.5 bg-white/60 border border-gray-200 rounded-xl px-1 py-1">
                      <button onClick={() => { setEditingProject(activeProject); setForm({ project_type: activeProject.project_type, client_name: activeProject.client_name, project_name: activeProject.project_name, service: activeProject.service || '', contract_price: activeProject.project_type === 'internal' ? '' : String(activeProject.contract_price || ''), monthly_rate: activeProject.monthly_rate != null ? String(activeProject.monthly_rate) : '', monthly_deliverables: (activeProject as any).monthly_deliverables != null ? String((activeProject as any).monthly_deliverables) : '', status: activeProject.status, stage: activeProject.stage ?? DEFAULT_STAGE, start_date: activeProject.start_date || '', deadline: activeProject.deadline || '', notes: activeProject.notes || '', contact_email: activeProject.contact_email || '', drive_url: (activeProject as any).drive_url || '' } as any); setShowForm(true); }}
                        className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-white transition-colors">
                        <i className="ri-edit-line text-sm"></i> Edit
                      </button>
                      {!internalProject && <>
                        <div className="w-px h-4 bg-gray-200" />
                        <button onClick={() => void openInvoicePrintView(activeProject)}
                          className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-white transition-colors">
                          <i className="ri-printer-line text-sm"></i> Print
                        </button>
                      </>}
                    </div>

                    <button onClick={() => void toggleArchiveProject(activeProject)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-amber-100"
                      title={activeProject.archived_at ? 'Unarchive project' : 'Archive project (kept — reopen anytime from the Archived tab)'}>
                      <i className={`${activeProject.archived_at ? 'ri-inbox-unarchive-line' : 'ri-archive-line'} text-sm`}></i>
                    </button>

                    {/* Delete — quiet danger */}
                    <button onClick={() => void deleteProject(activeProject)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-rose-100"
                      title="Delete project">
                      <i className="ri-delete-bin-line text-sm"></i>
                    </button>

                    {/* Separator */}
                    <div className="w-px h-5 bg-gray-200" />

                    {/* Primary actions */}
                    {!internalProject && <button onClick={() => navigate(`/hub/admin/invoices/${activeProject.id}`)}
                      className="text-xs px-3 py-2 bg-[#111827] hover:bg-gray-800 text-white rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors font-medium">
                      <i className="ri-mail-send-line text-sm"></i> Send Invoice
                    </button>}
                    {!isLicenseProject(activeProject) && <button onClick={() => setWorkspaceOpen(true)}
                      className="text-xs px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors font-medium">
                      <i className="ri-layout-grid-line text-sm"></i> Workspace
                    </button>}
                </div>

                {/* Ops stats strip — always shown, finance only for client */}
                {internalProject ? (
                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex-wrap">
                    <span><span className="font-semibold text-gray-800">{activeProject.hub_project_contractors.length}</span> <span className="text-gray-400 text-xs">members</span></span>
                    <span className="text-gray-200">|</span>
                    <span><span className="font-semibold text-gray-800">{tasks.length}</span> <span className="text-gray-400 text-xs">tasks</span></span>
                    <span className="text-gray-200">|</span>
                    <span><span className="font-semibold text-emerald-600">{tasks.filter(t => t.status === 'done').length}</span> <span className="text-gray-400 text-xs">done</span></span>
                    <span className="text-gray-200">|</span>
                    <span className={`text-xs font-medium ${cfg.cls} px-2 py-0.5 rounded-full`}>{cfg.label}</span>
                  </div>
                ) : isRetainerProject(activeProject) ? (
                  <>
                    {/* Retainer finance strip — owner only */}
                    {isOwner && <><div className="mt-4 flex items-center gap-3 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex-wrap">
                      {activeProject.contract_price > 0 && <><span>Setup Fee: <strong className="text-gray-700">{fmt(activeProject.contract_price)}</strong></span>
                      <span className="text-gray-200">|</span></>}
                      <span>Monthly: <strong className="text-indigo-600">{fmtRate(activeProject.monthly_rate, (activeProject as any).monthly_rate_currency)}</strong></span>
                      <span className="text-gray-200">|</span>
                      <span>Collected: <strong className="text-emerald-600">{fmt(d.totalPaid)}</strong></span>
                      <span className="text-gray-200">|</span>
                      <span>Months paid: <strong className="text-gray-700">{d.monthsCollected ?? 0}</strong></span>
                      <span className="text-gray-200">|</span>
                      <span>Costs: <strong className="text-rose-500">{fmt(d.totalCosts)}</strong></span>
                    </div>
                    {/* Retainer payment history bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Client payments</span>
                        <span>{d.monthsCollected ?? 0} month{(d.monthsCollected ?? 0) !== 1 ? 's' : ''} · {fmt(d.totalPaid)} collected</span>
                      </div>
                      <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white/55">
                        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: d.totalPaid > 0 ? '100%' : '0%' }} />
                      </div>
                    </div></>}
                  </>
                ) : (
                  <>
                    {/* Client finance strip */}
                    <div className="mt-4 flex items-center gap-3 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex-wrap">
                      <span>Contract: <strong className="text-gray-700">{fmt(activeProject.contract_price)}</strong></span>
                      <span className="text-gray-200">|</span>
                      <span>Collected: <strong className="text-emerald-600">{fmt(d.totalPaid)}</strong></span>
                      <span className="text-gray-200">|</span>
                      <span>Costs: <strong className="text-rose-500">{fmt(d.totalCosts)}</strong></span>
                      <span className="text-gray-200">|</span>
                      <span>Balance: <strong className={d.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}>{fmt(d.balance)}</strong></span>
                    </div>
                    {/* Collection progress */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Client payments</span>
                        <span>{fmt(d.totalPaid)} of {fmt(activeProject.contract_price)}</span>
                      </div>
                      <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white/55">
                        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(d.paidPct, 100)}%` }} />
                      </div>
                    </div>
                  </>
                )}
                {/* Inline client checklist */}
                {!internalProject && (() => {
                  const overrides: Record<string, boolean> = (activeProject as any).client_checklist ?? {};
                  const autoStates: Record<string, boolean> = {
                    proposal: !!(clientProposals.find(p => p.status === 'sent') || clientProposals[0]),
                    contract: !!(contracts.find(c => c.status === 'signed') || contracts.find(c => c.status === 'sent')),
                    onboarding: !!wsQuestionnaires.find(q => q.status === 'submitted'),
                    email: !!activeProject.contact_email,
                  };
                  const items = [
                    { key: 'proposal', label: 'Proposal' },
                    { key: 'contract', label: 'Contract' },
                    { key: 'onboarding', label: 'Onboarding' },
                    { key: 'email', label: 'Email' },
                  ];
                  const effective = (key: string) => key in overrides ? overrides[key] : autoStates[key];
                  const doneCount = items.filter(i => effective(i.key)).length;
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1">On file</span>
                      {items.map(item => {
                        const done = effective(item.key);
                        const manual = item.key in overrides;
                        return (
                          <button
                            key={item.key}
                            onClick={() => toggleChecklist(item.key, autoStates[item.key])}
                            title={manual ? 'Manually set — click to toggle' : 'Click to manually mark'}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors border ${
                              done ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${done ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                            {item.label}
                            {manual && <i className="ri-user-line text-[8px] opacity-60" />}
                          </button>
                        );
                      })}
                      <span className={`ml-auto text-[10px] font-bold ${doneCount === items.length ? 'text-emerald-500' : 'text-gray-300'}`}>{doneCount}/{items.length}</span>
                    </div>
                  );
                })()}
                {/* Team inline */}
                {!isLicenseProject(activeProject) && activeProject.hub_project_contractors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1">Team</span>
                    <div className="flex items-center">
                      {activeProject.hub_project_contractors.slice(0, 6).map((pc, i) => pc.hub_users && (
                        <div key={pc.hub_users.id} title={pc.hub_users.full_name} style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 6 - i }} className="relative">
                          {pc.hub_users.avatar_url
                            ? <img src={pc.hub_users.avatar_url} alt={pc.hub_users.full_name} className="w-6 h-6 rounded-full object-cover object-top border-2 border-white" />
                            : <div className="w-6 h-6 rounded-full bg-[#FF6B35] border-2 border-white flex items-center justify-center"><span className="text-white text-[9px] font-bold">{pc.hub_users.full_name[0]}</span></div>
                          }
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-400">{activeProject.hub_project_contractors.length} member{activeProject.hub_project_contractors.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {activeProject.notes && <p className="text-xs text-gray-400 italic mt-2">{activeProject.notes}</p>}
              </div>

              {!internalProject && <div className="space-y-3">
                {/* Financials — merged payments + schedule + costs */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                  <button onClick={() => toggleSection('financials')} className="w-full flex items-center justify-between cursor-pointer group">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Financials</p>
                    <div className="flex items-center gap-2">
                      {!openSections['financials'] && (
                        <span className="text-[11px] text-gray-400 font-medium">
                          {activeProject.hub_project_payments.length > 0 && <span className="text-emerald-600">{fmt(d.totalPaid)} in</span>}
                          {activeProject.hub_project_costs.length > 0 && <span className="text-rose-500"> · {fmt(d.totalCosts)} costs</span>}
                          {(activeProject.hub_payment_reminders ?? []).filter(r => r.status === 'pending').length > 0 && <span className="text-amber-600"> · {(activeProject.hub_payment_reminders ?? []).filter(r => r.status === 'pending').length} due</span>}
                        </span>
                      )}
                      <i className={`ri-arrow-${openSections['financials'] ? 'up' : 'down'}-s-line text-gray-400 text-sm group-hover:text-gray-600`}></i>
                    </div>
                  </button>
                  {openSections['financials'] && (
                  <div className="space-y-4">

                  {/* — Payments sub-section — */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Payments received</p>
                    <>
                      {activeProject.hub_project_payments.length === 0 ? (
                        <p className="text-xs text-gray-400">No payments logged yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {[...activeProject.hub_project_payments].sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime()).map((pp) => (
                            <div key={pp.id} className="bg-white/45 border border-white/65 rounded-xl overflow-hidden backdrop-blur-md">
                              {editingPaymentId === pp.id ? (
                                <div className="p-2.5 space-y-2">
                                  <div className="flex gap-2">
                                    <input type="number" value={editPayForm.amount} onChange={e => setEditPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="Amount"
                                      className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                                    <input type="date" value={editPayForm.date} onChange={e => setEditPayForm(f => ({ ...f, date: e.target.value }))}
                                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                                  </div>
                                  <input value={editPayForm.notes} onChange={e => setEditPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)"
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                                  <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-white transition-colors flex-1">
                                      <i className="ri-image-add-line text-gray-400 text-sm"></i>
                                      <span className="text-xs text-gray-400 truncate">{editPayForm.receipt ? editPayForm.receipt.name : editPayForm.existingReceiptUrl ? 'Replace receipt' : 'Attach proof of payment'}</span>
                                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setEditPayForm(f => ({ ...f, receipt: e.target.files?.[0] ?? null }))} />
                                    </label>
                                    {editPayForm.existingReceiptUrl && !editPayForm.receipt && (
                                      <button onClick={() => setLightboxUrl(editPayForm.existingReceiptUrl)} className="cursor-pointer flex-shrink-0">
                                        <img src={editPayForm.existingReceiptUrl} alt="receipt" className="h-8 w-12 object-cover rounded border border-gray-200 hover:opacity-80" />
                                      </button>
                                    )}
                                    {(editPayForm.receipt || editPayForm.existingReceiptUrl) && (
                                      <button onClick={() => setEditPayForm(f => ({ ...f, receipt: null, existingReceiptUrl: null }))} className="text-gray-300 hover:text-rose-400 cursor-pointer text-xs flex-shrink-0">
                                        <i className="ri-close-line"></i>
                                      </button>
                                    )}
                                  </div>
                                  {editPayError && <p className="text-xs text-red-500">{editPayError}</p>}
                                  <div className="flex gap-2">
                                    <button onClick={() => setEditingPaymentId(null)} className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-white cursor-pointer">Cancel</button>
                                    <button onClick={updatePayment} disabled={!editPayForm.amount || editPaySaving}
                                      className="flex-1 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 cursor-pointer disabled:opacity-40">
                                      {editPaySaving ? '...' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2 p-2.5">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-emerald-600">{fmt(pp.amount)}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      <span className="text-[11px] text-gray-400">
                                        <i className="ri-calendar-line text-[10px] mr-0.5"></i>
                                        {fmtDate(pp.paid_at)}
                                      </span>
                                      {pp.notes && (
                                        <span className="text-[11px] text-gray-500">
                                          · <i className="ri-file-text-line text-[10px] mr-0.5"></i>{pp.notes}
                                        </span>
                                      )}
                                    </div>
                                    {pp.receipt_url && (
                                      <button onClick={() => setLightboxUrl(pp.receipt_url)} className="mt-1.5 cursor-pointer">
                                        <img src={getDriveThumbnailUrl(pp.receipt_url)} alt="receipt" className="h-8 w-14 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button onClick={() => setSendReceiptModal({ payment: pp, project: activeProject })}
                                      className="text-gray-300 hover:text-sky-500 cursor-pointer mt-0.5" title="Send receipt to client">
                                      <i className="ri-mail-send-line text-xs"></i>
                                    </button>
                                    <button onClick={() => { setEditingPaymentId(pp.id); setEditPayForm({ amount: String(pp.amount), date: pp.paid_at, notes: pp.notes ?? '', receipt: null, existingReceiptUrl: pp.receipt_url }); setEditPayError(''); }}
                                      className="text-gray-300 hover:text-gray-600 cursor-pointer mt-0.5"><i className="ri-edit-line text-xs"></i></button>
                                    <button onClick={() => deletePayment(pp.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer mt-0.5"><i className="ri-delete-bin-line text-xs"></i></button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <div className="flex gap-2">
                          <div className="flex flex-1 gap-0">
                            <select value={payCurrency} onChange={e => setPayCurrency(e.target.value as 'PHP' | 'USD')}
                              className="px-2 py-1.5 text-xs border border-gray-200 rounded-l-lg focus:outline-none bg-gray-50 border-r-0">
                              <option value="PHP">₱</option>
                              <option value="USD">$</option>
                            </select>
                            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount"
                              className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                          </div>
                          <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                        </div>
                        {payCurrency === 'USD' && (
                          <p className="text-xs text-gray-400">≈ ₱{payAmount ? (parseFloat(payAmount) * usdRate).toLocaleString() : '0'} at ₱{usdRate}/USD</p>
                        )}
                        <div className="flex gap-2">
                          <input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Notes (optional)"
                            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                          <button onClick={logPayment} disabled={!payAmount || paySaving}
                            className="px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                            {paySaving ? '...' : '+ Log'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <i className="ri-image-add-line text-gray-400 text-sm"></i>
                            <span className="text-xs text-gray-400">{payReceipt ? payReceipt.name : 'Attach receipt (optional)'}</span>
                            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setPayReceipt(e.target.files?.[0] ?? null)} />
                          </label>
                          {payReceipt && (
                            <button onClick={() => setPayReceipt(null)} className="text-gray-300 hover:text-rose-400 cursor-pointer text-xs">
                              <i className="ri-close-line"></i>
                            </button>
                          )}
                        </div>
                        {payError && <p className="text-xs text-red-500">{payError}</p>}
                      </div>
                    </>
                  </div>

                  {/* — Schedule sub-section — */}
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Payment schedule</p>
                    <>
                      <p className="text-[10px] text-gray-400">Reminders auto-send on due date</p>
                      {(activeProject.hub_payment_reminders ?? []).length === 0 ? (
                        <p className="text-xs text-gray-400">No reminders scheduled.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {[...(activeProject.hub_payment_reminders ?? [])].sort((a, b) => a.send_date.localeCompare(b.send_date)).map(r => {
                            const isPast = r.send_date < localToday();
                            const statusCls = r.status === 'sent' ? 'text-emerald-600 bg-emerald-50' : r.status === 'cancelled' ? 'text-gray-400 bg-gray-100 line-through' : isPast ? 'text-rose-500 bg-rose-50' : 'text-amber-600 bg-amber-50';
                            const statusLabel = r.status === 'sent' ? 'Sent' : r.status === 'cancelled' ? 'Cancelled' : isPast ? 'Overdue' : 'Pending';
                            return (
                              <div key={r.id} className="flex items-center justify-between gap-2 bg-white/48 border border-white/65 rounded-xl px-3 py-2 backdrop-blur-md">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-gray-700">
                                      {new Date(r.send_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    {r.amount_due && <span className="text-xs font-semibold text-[#FF6B35]">{fmt(r.amount_due)}</span>}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusCls}`}>{statusLabel}</span>
                                  </div>
                                  {r.notes && <p className="text-[11px] text-gray-400 mt-0.5">{r.notes}</p>}
                                </div>
                                {r.status === 'pending' && (
                                  <button onClick={() => deleteReminder(r.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer flex-shrink-0">
                                    <i className="ri-delete-bin-line text-xs"></i>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <div className="flex gap-2">
                          <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                          <input type="number" value={reminderAmount} onChange={e => setReminderAmount(e.target.value)} placeholder="Amount (optional)"
                            className="w-32 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                        </div>
                        <div className="flex gap-2">
                          <input value={reminderNotes} onChange={e => setReminderNotes(e.target.value)} placeholder="Note e.g. 2nd installment"
                            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                          <button onClick={addReminder} disabled={!reminderDate || reminderSaving}
                            className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-700 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                            {reminderSaving ? '...' : '+ Add'}
                          </button>
                        </div>
                        {reminderError && <p className="text-xs text-red-500">{reminderError}</p>}
                      </div>
                    </>
                  </div>

                  {/* — Costs sub-section — */}
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Operational costs</p>
                    <>
                      {activeProject.hub_project_costs.length === 0 ? (
                        <p className="text-xs text-gray-400">No costs logged yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {activeProject.hub_project_costs.map(cc => (
                            <div key={cc.id} className="flex items-center justify-between gap-2 text-sm">
                              <div>
                                <span className="text-gray-700 text-xs">{cc.label}</span>
                                <span className="font-medium text-rose-500 ml-2">{fmt(cc.amount)}</span>
                                <span className="text-xs text-gray-400 ml-1">· {new Date(cc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                              <button onClick={() => deleteCost(cc.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer"><i className="ri-delete-bin-line text-xs"></i></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <div className="flex gap-2">
                          <input value={costLabel} onChange={e => setCostLabel(e.target.value)} placeholder="e.g. Hosting, Domain"
                            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                          <input type="number" value={costAmount} onChange={e => setCostAmount(e.target.value)} placeholder="Amount"
                            className="w-24 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                        </div>
                        <div className="flex gap-2">
                          <input type="date" value={costDate} onChange={e => setCostDate(e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                          <button onClick={logCost} disabled={!costLabel.trim() || !costAmount || costSaving}
                            className="flex-1 px-3 py-1.5 bg-rose-500 text-white text-xs rounded-lg hover:bg-rose-600 cursor-pointer disabled:opacity-40">
                            {costSaving ? '...' : '+ Log Cost'}
                          </button>
                        </div>
                        {costError && <p className="text-xs text-red-500">{costError}</p>}
                      </div>
                    </>
                  </div>

                  </div>
                  )}
                </div>
              </div>}

              {/* Team — payouts config, avatars shown in header */}
              {!isLicenseProject(activeProject) && <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <button onClick={() => toggleSection('team')} className="w-full flex items-center justify-between cursor-pointer group">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Team & Payouts</p>
                  <div className="flex items-center gap-2">
                    {!teamPayoutsOpen && <span className="text-[11px] text-gray-400">{activeProject.hub_project_contractors.length} member{activeProject.hub_project_contractors.length !== 1 ? 's' : ''}</span>}
                    <i className={`ri-arrow-${teamPayoutsOpen ? 'up' : 'down'}-s-line text-gray-400 text-sm group-hover:text-gray-600`}></i>
                  </div>
                </button>
                {teamPayoutsOpen && (
                  <>
                  <p className="text-[11px] text-gray-400">
                    {internalProject ? 'Assign people and roles. Tasks and workspace access start immediately.' : 'Assign people first, then configure payout type and amount for each person.'}
                  </p>
                  {activeProject.hub_project_contractors.length === 0 ? (
                  <p className="text-xs text-gray-400">No employees assigned to this project yet.</p>
                  ) : (
                  <div className="space-y-3">
                    {activeProject.hub_project_contractors.map(pc => {
                      const u = pc.hub_users;
                      if (!u) return null;
                      const configForm = ctxConfigForm[pc.id] ?? {
                        payoutType: (pc.payout_type === 'fixed' ? 'fixed' : 'percentage') as 'percentage' | 'fixed',
                        percentage: pc.percentage ? String(pc.percentage) : '',
                        fixedAmount: pc.fixed_amount != null ? String(pc.fixed_amount) : '',
                      };
                      const setConfigForm = (patch: Partial<typeof configForm>) => setCtxConfigForm(prev => ({
                        ...prev,
                        [pc.id]: { ...configForm, ...patch },
                      }));
                      const isFixed = pc.payout_type === 'fixed';
                      const excluded = !!pc.exclude_from_payout;
                      const hasConfiguredPayout = !excluded && (isFixed ? (pc.fixed_amount ?? 0) > 0 : pc.percentage > 0);
                      const cut = hasConfiguredPayout ? (isFixed ? (pc.fixed_amount ?? 0) : d.netProfit * (pc.percentage / 100)) : 0;
                      const totalPaidOut = pc.hub_project_contractor_payouts.reduce((s, x) => s + x.amount, 0);
                      const paidPct = cut > 0 ? Math.min((totalPaidOut / cut) * 100, 100) : 0;
                      const isFullyPaid = totalPaidOut >= cut && cut > 0;
                      const pf = ctxPayForm[pc.id] ?? { amount: cut > 0 ? String((cut - totalPaidOut).toFixed(2)) : '', date: localToday(), notes: '', receipt: null, notify: true };
                      const setPf = (patch: Partial<typeof pf>) => setCtxPayForm(prev => ({ ...prev, [pc.id]: { ...pf, ...patch } }));
                      return (
                        <div key={pc.id} className="border border-gray-100 bg-white rounded-xl overflow-hidden">
                          {/* Employee header */}
                          <div className="flex items-center gap-3 p-3 bg-white/45 backdrop-blur-md">
                            <Avatar name={u.full_name} url={u.avatar_url} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-gray-800">{u.full_name}</p>
                                {pc.project_role && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500 font-medium">
                                    {pc.project_role}
                                  </span>
                                )}
                                {internalProject ? (
                                  <span className="text-xs text-gray-400">Internal assignment</span>
                                ) : !hasConfiguredPayout ? (
                                  <span className="text-xs text-amber-600">No payout set</span>
                                ) : isFixed ? (
                                  <span className="text-xs text-gray-400">Fixed fee → <strong className="text-[#111827]">{fmt(cut)}</strong></span>
                                ) : (
                                  <span className="text-xs text-gray-400">{pc.percentage}% → <strong className="text-[#111827]">{fmt(cut)}</strong></span>
                                )}
                                {!internalProject && excluded && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">No payout</span>
                                )}
                                {!internalProject && !excluded && hasConfiguredPayout && (isFullyPaid
                                  ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Paid in full</span>
                                  : totalPaidOut > 0
                                    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{fmt(totalPaidOut)} paid</span>
                                    : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Unpaid</span>
                                )}
                              </div>
                              {!internalProject && hasConfiguredPayout && (
                                <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden w-full">
                                  <div className={`h-full rounded-full transition-all ${isFullyPaid ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${paidPct}%` }} />
                                </div>
                              )}
                            </div>
                            {!internalProject && (
                              <button
                                onClick={() => toggleExcludeFromPayout(pc.id, excluded)}
                                title={excluded ? 'Click to include in payout' : 'Exclude from payout'}
                                className={`text-xs px-2 py-1 rounded-lg border cursor-pointer transition-colors flex-shrink-0 ${excluded ? 'border-gray-200 text-gray-400 bg-gray-50 hover:bg-white' : 'border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50'}`}
                              >
                                {excluded ? <><i className="ri-eye-line mr-1"></i>Include</> : <><i className="ri-eye-off-line mr-1"></i>Exclude</>}
                              </button>
                            )}
                            <button onClick={() => removeContractor(pc.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer flex-shrink-0"><i className="ri-delete-bin-line text-xs"></i></button>
                          </div>

                          {!internalProject && !excluded && <div className="px-3 py-2.5 border-t border-gray-100 bg-white space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Payout Setup</p>
                              <span className="text-[11px] text-gray-400">Net profit basis: <strong className="text-emerald-600">{fmt(d.netProfit)}</strong></span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
                                <button onClick={() => setConfigForm({ payoutType: 'percentage' })}
                                  className={`px-2.5 py-1.5 cursor-pointer transition-colors ${configForm.payoutType === 'percentage' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                                  Percentage
                                </button>
                                <button onClick={() => setConfigForm({ payoutType: 'fixed' })}
                                  className={`px-2.5 py-1.5 cursor-pointer transition-colors border-l border-gray-200 ${configForm.payoutType === 'fixed' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                                  Fixed Fee
                                </button>
                              </div>
                              {configForm.payoutType === 'percentage' ? (
                                <div className="relative w-24">
                                  <input type="number" value={configForm.percentage} onChange={e => setConfigForm({ percentage: e.target.value })} placeholder="%" min="1" max="100"
                                    className="w-full px-2.5 py-1.5 pr-6 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                                </div>
                              ) : (
                                <div className="relative w-40">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₱</span>
                                  <input type="number" value={configForm.fixedAmount} onChange={e => setConfigForm({ fixedAmount: e.target.value })} placeholder="Fixed fee amount"
                                    className="w-full pl-6 pr-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                                </div>
                              )}
                              <button onClick={() => saveContractorPayoutConfig(pc.id)} disabled={ctxConfigSaving[pc.id]}
                                className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                                {ctxConfigSaving[pc.id] ? 'Saving...' : hasConfiguredPayout ? 'Update Payout' : 'Set Payout'}
                              </button>
                            </div>
                            {ctxConfigError[pc.id] && <p className="text-xs text-red-500">{ctxConfigError[pc.id]}</p>}
                          </div>}

                          {/* Payout history */}
                          {!internalProject && !excluded && hasConfiguredPayout && pc.hub_project_contractor_payouts.length > 0 && (
                            <div className="px-3 py-2 space-y-1.5 border-t border-gray-100">
                              {pc.hub_project_contractor_payouts.map(pp => (
                                <div key={pp.id} className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 text-gray-600 flex-wrap">
                                    <i className="ri-arrow-right-line text-gray-300 text-[10px]"></i>
                                    <span className="font-semibold text-emerald-600">{fmt(pp.amount)}</span>
                                    <span className="text-gray-400">{fmtDate(pp.paid_at)}</span>
                                    {pp.notes && <span className="text-gray-400">· {pp.notes}</span>}
                                    {pp.receipt_url && (
                                      <button onClick={() => setLightboxUrl(pp.receipt_url)} className="cursor-pointer flex-shrink-0">
                                        <img src={getDriveThumbnailUrl(pp.receipt_url)} alt="receipt" className="h-6 w-9 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity" />
                                      </button>
                                    )}
                                  </div>
                                  <button onClick={() => deleteContractorPayout(pp.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer"><i className="ri-delete-bin-line text-[10px]"></i></button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Log payout form */}
                          {!internalProject && !excluded && hasConfiguredPayout && !isFullyPaid && (
                            <div className="px-3 py-2.5 border-t border-gray-100 bg-white space-y-2">
                              <div className="flex gap-2">
                                <div className="flex-1 flex gap-1">
                                  <input type="number" value={pf.amount} onChange={e => setPf({ amount: e.target.value })} placeholder={`Amount (of ${fmt(cut)})`}
                                    className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                                  <button
                                    type="button"
                                    onClick={() => setPf({ amount: String((cut - totalPaidOut).toFixed(2)) })}
                                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 cursor-pointer whitespace-nowrap"
                                  >
                                    Remaining
                                  </button>
                                </div>
                                <input type="date" value={pf.date} onChange={e => setPf({ date: e.target.value })}
                                  className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                              </div>
                              <div className="flex gap-2">
                                <input value={pf.notes} onChange={e => setPf({ notes: e.target.value })} placeholder="Notes (optional)"
                                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                                <button onClick={() => logContractorPayout(pc.id, cut, u.full_name, u.email, activeProject)} disabled={!pf.amount || ctxPaySaving[pc.id]}
                                  className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                                  {ctxPaySaving[pc.id] ? '...' : '+ Payout'}
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                  <i className="ri-image-add-line text-gray-400 text-sm"></i>
                                  <span className="text-xs text-gray-400">{pf.receipt ? pf.receipt.name : 'Attach receipt (optional)'}</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={e => setPf({ receipt: e.target.files?.[0] ?? null })} />
                                </label>
                                {pf.receipt && (
                                  <button onClick={() => setPf({ receipt: null })} className="text-gray-300 hover:text-rose-400 cursor-pointer text-xs">
                                    <i className="ri-close-line"></i>
                                  </button>
                                )}
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                                <input type="checkbox" checked={pf.notify} onChange={e => setPf({ notify: e.target.checked })}
                                  className="w-3.5 h-3.5 accent-[#FF6B35]" />
                                <span className="text-xs text-gray-400">
                                  Notify {u.email ? u.full_name.split(' ')[0] : 'contractor'} via email
                                  {!u.email && <span className="text-amber-500 ml-1">(no email on file)</span>}
                                </span>
                              </label>
                              {ctxPayError[pc.id] && <p className="text-xs text-red-500">{ctxPayError[pc.id]}</p>}
                              {ctxPayWarn[pc.id] && <p className="text-xs text-amber-600">{ctxPayWarn[pc.id]}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  )}
                  {unassigned.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <div className="flex gap-2">
                        <select value={addCtxId} onChange={e => {
                          setAddCtxId(e.target.value);
                        }}
                          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white">
                          <option value="">Add team member...</option>
                          {unassigned.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.department ? ` — ${c.department}` : ''}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <input value={addCtxRole} onChange={e => setAddCtxRole(e.target.value)} placeholder="Project role (optional)"
                          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                        <button onClick={addContractor} disabled={!addCtxId || ctxSaving}
                          className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                          {ctxSaving ? '...' : 'Add Team Member'}
                        </button>
                      </div>
                      {ctxAddError && <p className="text-xs text-red-500">{ctxAddError}</p>}
                      <p className="text-[11px] text-gray-400">{internalProject ? 'Assign people and roles. Tasks and workspace access start immediately.' : 'Payout can be configured after assignment.'}</p>
                    </div>
                  )}
                  </>
                )}
              </div>}

              {/* Client Contract */}
              {!internalProject && (
                <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                  <button onClick={() => {
                    toggleSection('contracts');
                    if (!openSections['contracts'] && contractsLoaded !== activeProject.id) loadContracts(activeProject.id);
                    if (!openSections['contracts'] && !contractPrompt) {
                      const p = activeProject;
                      const lines = [
                        p.service ? `Service: ${p.service}` : '',
                        p.project_type === 'retainer'
                          ? [p.contract_price ? `Setup fee: ₱${p.contract_price.toLocaleString()} (one-time)` : '', p.monthly_rate ? `Monthly fee: ₱${p.monthly_rate.toLocaleString()}/mo` : ''].filter(Boolean).join('\n')
                          : (p.contract_price ? `Total fee: ₱${p.contract_price.toLocaleString()}` : ''),
                        p.start_date && p.deadline ? `Timeline: ${fmtDate(p.start_date)} – ${fmtDate(p.deadline)}` : p.deadline ? `Deadline: ${fmtDate(p.deadline)}` : '',
                        p.notes ? `Notes: ${p.notes}` : '',
                      ].filter(Boolean);
                      setContractPrompt(lines.join('\n'));
                    }
                  }} className="w-full flex items-center justify-between cursor-pointer group">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Contract</p>
                    <div className="flex items-center gap-2">
                      {!openSections['contracts'] && contracts.length > 0 && (
                        <span className="text-xs font-medium" style={{ color: contracts.some(c => c.status === 'signed') ? '#16a34a' : contracts.some(c => c.status === 'sent') ? '#d97706' : '#9ca3af' }}>
                          {contracts.some(c => c.status === 'signed') ? 'Signed' : contracts.some(c => c.status === 'sent') ? 'Awaiting signature' : `${contracts.length} draft${contracts.length !== 1 ? 's' : ''}`}
                        </span>
                      )}
                      <i className={`ri-arrow-${openSections['contracts'] ? 'up' : 'down'}-s-line text-gray-400 text-sm group-hover:text-gray-600`}></i>
                    </div>
                  </button>

                  {openSections['contracts'] && (
                    <>
                      {/* Contract send link toast */}
                      {contractSendSlug && (
                        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <i className="ri-links-line text-emerald-600 text-sm flex-shrink-0"></i>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-emerald-700 font-medium">Contract link ready to share</p>
                            <p className="text-[11px] text-emerald-600 truncate">{window.location.origin}/c/{contractSendSlug}</p>
                          </div>
                          <button
                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/c/${contractSendSlug}`); }}
                            className="text-emerald-600 hover:text-emerald-800 cursor-pointer flex-shrink-0 text-xs font-medium">
                            Copy
                          </button>
                          <button onClick={() => setContractSendSlug(null)} className="text-emerald-400 hover:text-emerald-600 cursor-pointer flex-shrink-0"><i className="ri-close-line text-xs"></i></button>
                        </div>
                      )}

                      {/* Existing contracts list */}
                      {contracts.length > 0 && (
                        <div className="space-y-2">
                          {contracts.map(c => (
                            <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-100 rounded-xl bg-white/60">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-800 truncate">{c.title}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                    c.status === 'signed' ? 'bg-emerald-100 text-emerald-700' :
                                    c.status === 'sent' ? 'bg-amber-100 text-amber-700' :
                                    'bg-gray-100 text-gray-500'
                                  }`}>
                                    {c.status === 'signed' ? `Signed · ${c.signer_name}` : c.status === 'sent' ? 'Awaiting signature' : 'Draft'}
                                  </span>
                                  {c.status === 'signed' && c.signed_at && (
                                    <span className="text-[10px] text-gray-400">
                                      {new Date(c.signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {new Date(c.signed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <a href={`/c/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gray-600 cursor-pointer" title="View contract">
                                  <i className="ri-external-link-line text-xs"></i>
                                </a>
                                {c.status === 'draft' && (
                                  <button onClick={() => markContractSent(c.id, c.slug)} className="text-gray-300 hover:text-amber-500 cursor-pointer" title="Mark as sent (share link)">
                                    <i className="ri-send-plane-line text-xs"></i>
                                  </button>
                                )}
                                {c.status === 'sent' && (
                                  <button onClick={() => setContractSendSlug(c.slug)} className="text-gray-300 hover:text-sky-500 cursor-pointer" title="Copy share link">
                                    <i className="ri-links-line text-xs"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* AI generation area */}
                      {!contractPreview ? (
                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          <p className="text-[11px] text-gray-400">Project details pre-filled below. Add deliverables, payment structure, or any special terms before generating.</p>
                          <textarea
                            value={contractPrompt}
                            onChange={e => setContractPrompt(e.target.value)}
                            placeholder="Add specific deliverables, payment structure, and any special terms…"
                            rows={3}
                            className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none"
                          />
                          {contractGenError && <p className="text-xs text-red-500">{contractGenError}</p>}
                          <button
                            onClick={generateContract}
                            disabled={!contractPrompt.trim() || contractGenerating}
                            className="w-full py-2 text-xs bg-[#111827] text-white rounded-lg hover:bg-gray-800 cursor-pointer disabled:opacity-40 font-medium flex items-center justify-center gap-1.5">
                            {contractGenerating ? (
                              <><i className="ri-loader-4-line animate-spin text-sm"></i> Generating…</>
                            ) : (
                              <><i className="ri-magic-line text-sm"></i> Generate Contract with AI</>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-700 leading-snug">{contractPreview.title}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openContractPreview(contractPreview)}
                                className="text-[11px] text-[#D64F1E] hover:underline cursor-pointer font-medium flex items-center gap-1">
                                <i className="ri-eye-line text-xs"></i> Preview
                              </button>
                              <button onClick={() => setContractPreview(null)} className="text-gray-300 hover:text-gray-500 cursor-pointer ml-1"><i className="ri-close-line text-sm"></i></button>
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-400">Contract generated. Preview the full document before sending.</p>
                          {contractGenError && <p className="text-xs text-red-500">{contractGenError}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveContract(false)}
                              disabled={contractSaving}
                              className="flex-1 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer disabled:opacity-40">
                              {contractSaving ? '...' : 'Save as Draft'}
                            </button>
                            <button
                              onClick={() => saveContract(true)}
                              disabled={contractSaving}
                              className="flex-1 py-2 text-xs bg-[#D64F1E] text-white rounded-lg hover:bg-[#b84218] cursor-pointer disabled:opacity-40 font-medium">
                              {contractSaving ? '...' : 'Save & Send to Client'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            </> // end desktop + mobile sheets
          );
        })() : (
          <div className="flex items-center justify-center text-gray-400 py-8">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                <i className="ri-folder-open-line text-2xl text-gray-300"></i>
              </div>
              <p className="text-sm">Select a project card to view details</p>
            </div>
          </div>
        )}
        </div>{/* end left column */}

        {/* ── Right: My Tasks panel ── */}
        {myTasks.length > 0 && (() => {
          const today = localToday();
          const overdueCount = myTasks.filter(t => isTaskOverdue(t, today)).length;
          const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();
          const STATUS_OPTIONS = [
            { value: 'todo',        label: 'To Do',       dot: 'bg-gray-300' },
            { value: 'in_progress', label: 'In Progress', dot: 'bg-sky-400' },
            { value: 'in_review',   label: 'In Review',   dot: 'bg-violet-400' },
            { value: 'blocked',     label: 'Blocked',     dot: 'bg-rose-400' },
            { value: 'done',        label: 'Done',        dot: 'bg-emerald-400' },
          ];
          const statusIcon = (status: string, completing: boolean) => {
            if (completing) return <i className="ri-checkbox-circle-fill text-emerald-500 text-xl flex-shrink-0" />;
            if (status === 'done') return <i className="ri-checkbox-circle-fill text-emerald-400 text-xl flex-shrink-0" />;
            if (status === 'in_progress') return <i className="ri-loader-4-line animate-spin text-sky-400 text-xl flex-shrink-0" />;
            if (status === 'blocked') return <i className="ri-close-circle-line text-rose-400 text-xl flex-shrink-0" />;
            if (status === 'in_review') return <i className="ri-eye-line text-violet-400 text-xl flex-shrink-0" />;
            return <i className="ri-circle-line text-gray-300 text-xl flex-shrink-0" />;
          };
          const updateMyTaskStatus = async (taskId: number, newStatus: string) => {
            const myTask = myTasks.find(t => t.id === taskId);
            // Blocked needs a reason; this list doesn't carry meta, so merge with the stored row
            let metaPatch: Record<string, unknown> = {};
            if (newStatus === 'blocked') {
              const reason = window.prompt("What's blocking this task? (visible to the team)");
              if (reason === null) return;
              const { data: cur } = await supabase.from('hub_project_tasks').select('meta').eq('id', taskId).maybeSingle();
              metaPatch = { meta: { ...((cur?.meta as any) ?? {}), blocked_reason: reason.trim() } };
            }
            const stamp = { updated_at: new Date().toISOString() };
            if (newStatus === 'done') {
              setMyTaskCompleting(taskId);
              await supabase.from('hub_project_tasks').update({ status: 'done', completed_at: new Date().toISOString(), ...stamp }).eq('id', taskId);
              setTimeout(() => {
                setMyTasks(prev => prev.filter(t => t.id !== taskId));
                setMyTaskCompleting(null);
              }, 1800);
            } else {
              await supabase.from('hub_project_tasks').update({ status: newStatus, completed_at: null, ...stamp, ...metaPatch }).eq('id', taskId);
              setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
            }
            if (myTask) logStatusChangeSideEffects(myTask, newStatus);
          };
          return (
            <div className="hidden lg:flex flex-col w-72 flex-shrink-0 px-3 relative overflow-hidden"
              style={{
                marginTop: '-1.5rem',
                marginBottom: '-6rem',
                marginRight: '-1.5rem',
                paddingBottom: '6rem',
                background: '#f9fafb',
                borderLeft: '1px solid rgba(200,210,230,0.35)',
              }}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 sticky top-0 mt-4 md:mt-6"
                style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                {/* Header */}
                <div className="px-5 pt-5 pb-4">
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">{dateLabel}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xl font-bold text-[#111827]">My Tasks</p>
                    {overdueCount > 0 && (
                      <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full flex-shrink-0">
                        {overdueCount} overdue
                      </span>
                    )}
                  </div>
                </div>

                {/* Task list */}
                <div className="px-3 pb-4 space-y-1">
                  {myTasks.map(t => {
                    const isOverdue = isTaskOverdue(t, today);
                    const daysLeft = t.due_date ? Math.ceil((new Date(t.due_date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000) : null;
                    const completing = myTaskCompleting === t.id;
                    const isDone = t.status === 'done';
                    return (
                      <div key={t.id}
                        className={`flex items-start gap-3 px-2 py-2.5 rounded-xl transition-all ${completing ? 'bg-emerald-50' : isDone ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                        <div className="relative flex-shrink-0 group/status mt-0.5">
                          <button onClick={() => {}} className="cursor-pointer" title="Change status">
                            {statusIcon(t.status, completing)}
                          </button>
                          {!completing && (
                            <div className="absolute left-0 top-7 z-30 bg-white border border-gray-100 rounded-xl shadow-xl py-1 min-w-[140px] hidden group-hover/status:block">
                              {STATUS_OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => updateMyTaskStatus(t.id, opt.value)}
                                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer text-left transition-colors ${t.status === opt.value ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {completing ? (
                          <p className="flex-1 text-sm font-medium text-emerald-600 line-through pt-0.5">Task completed</p>
                        ) : (
                          <button
                            onClick={() => {
                              // Open the task directly on top of the Projects page — don't switch
                              // into the project's workspace behind it. TaskDetailPanel resolves
                              // its own project (for the "Open Workspace" button etc.) from
                              // task.project_id via `detailProject`, so activeId/workspaceOpen
                              // don't need to be touched. Closing the panel now just lands back
                              // on the Projects page instead of a workspace with Financials/Team/
                              // Contracts sections in whatever state they were last left in.
                              openTaskDetail({ ...t, description: null, assigned_to: null, assignee_ids: null, sort_order: 0, color: null, start_date: null, archived: false, archived_at: null, attachments: null, project_id: t.project_id } as any);
                            }}
                            className="flex-1 min-w-0 text-left cursor-pointer"
                          >
                            <div className="flex items-start gap-2 flex-wrap">
                              <p className={`text-sm font-semibold leading-snug ${isDone ? 'line-through text-gray-400' : 'text-[#111827]'}`}>{t.title}</p>
                              {isOverdue && !isDone && <span className="text-[10px] font-semibold text-rose-500 flex-shrink-0 mt-0.5">Late</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{t.project_name}</p>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

      </div>
      )}

      {showForm && (
        <ProjectFormModal
          isEditing={!!editingProject}
          form={form}
          setForm={setForm}
          formError={formError}
          setFormError={setFormError}
          formSaving={formSaving}
          importedTasks={importedTasks}
          setImportedTasks={setImportedTasks}
          usdRate={usdRate}
          onSave={saveProject}
          onClose={() => { setShowForm(false); setEditingProject(null); }}
          onCancel={() => { setShowForm(false); setEditingProject(null); setImportedTasks([]); }}
        />
      )}

      {sendReceiptModal && (
        <SendReceiptModal
          payment={sendReceiptModal.payment}
          project={sendReceiptModal.project}
          onClose={() => setSendReceiptModal(null)}
        />
      )}

      {/* Unarchive: reopen or just restore visibility */}
      {unarchiveChoice && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4" onClick={() => setUnarchiveChoice(null)}>
          <div className="bg-white rounded-2xl w-full sm:max-w-sm shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Bring back “{unarchiveChoice.project_name}”?</h3>
              <p className="text-xs text-gray-400 mt-1">Tell the hub what this means for the project.</p>
            </div>
            <div className="space-y-2">
              <button onClick={() => doUnarchive(unarchiveChoice, 'ongoing')}
                className="w-full text-left rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 p-3.5 cursor-pointer transition-colors">
                <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5"><i className="ri-restart-line"></i>Work is resuming</p>
                <p className="text-xs text-gray-500 mt-0.5">Reopen as an Active project — it returns to the team's lists and boards.</p>
              </button>
              <button onClick={() => doUnarchive(unarchiveChoice, unarchiveChoice.status === 'cancelled' ? 'completed' : null)}
                className="w-full text-left rounded-xl border border-gray-200 hover:bg-gray-50 p-3.5 cursor-pointer transition-colors">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><i className="ri-eye-line"></i>Just bring it back into view</p>
                <p className="text-xs text-gray-500 mt-0.5">Keep it marked Completed — visible for reference, nothing reactivates.</p>
              </button>
            </div>
            <button onClick={() => setUnarchiveChoice(null)} className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Cancel — leave it archived</button>
          </div>
        </div>
      )}

      {lightboxUrl && <ReceiptLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      <TaskDetailPanel
        task={detailTask}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailTask(null); setNewTaskDefaultDueDate(undefined); }}
        onSaved={(saved) => {
          setTasks(prev => prev.some(t => t.id === saved.id)
            ? prev.map(t => t.id === saved.id ? { ...t, ...saved } : t)
            : [...prev, saved as ProjectTask]);
          setDetailTask(saved);
          // Keep the Tasks/Team tabs (allTasks) in sync — they're a separate
          // fetch from `tasks` and otherwise only refresh on next tab visit,
          // so a reassignment made here would keep showing the old assignee.
          setAllTasks(prev => prev.map(t => {
            if (t.id !== saved.id) return t;
            const assigneeIds = getTaskAssigneeIds(saved as any);
            const resolve = (id: string) => contractors.find(c => c.id === id) ?? t.assignees?.find((a: any) => a?.id === id) ?? null;
            return {
              ...t,
              ...saved,
              assignee: assigneeIds[0] ? resolve(assigneeIds[0]) : null,
              assignees: assigneeIds.map(resolve).filter(Boolean),
            };
          }));
          // Refresh comment count for this task
          if (saved.id) supabase.from('hub_project_task_comments').select('task_id').eq('task_id', saved.id)
            .then(({ data }) => setCommentCounts(prev => ({ ...prev, [saved.id]: data?.length ?? prev[saved.id] ?? 0 })));
          refreshWorkspaceActivity();
        }}
        onDeleted={(id) => {
          setTasks(prev => prev.map(t => t.id === id ? { ...t, deleted_at: new Date().toISOString() } : t));
          setAllTasks(prev => prev.filter(t => t.id !== id));
          setDetailOpen(false);
          setDetailTask(null);
          refreshWorkspaceActivity();
        }}
        onArchived={(id) => {
          setTasks(prev => prev.map(t => t.id === id ? { ...t, archived: true, archived_at: new Date().toISOString() } : t));
          setAllTasks(prev => prev.map(t => t.id === id ? { ...t, archived: true, archived_at: new Date().toISOString() } : t));
          setDetailOpen(false);
          setDetailTask(null);
        }}
        onActivityChange={refreshWorkspaceActivity}
        onOpenWorkspace={detailProject ? () => {
          const id = detailProject.id;
          setDetailOpen(false);
          setDetailTask(null);
          openProjectWorkspace(id);
        } : undefined}
        defaultDueDate={newTaskDefaultDueDate}
        projectId={detailProject?.id ?? activeId ?? 0}
        projectName={detailProject?.project_name ?? 'General'}
        teamMembers={detailTaskTeam.map(u => ({ id: u!.id, full_name: u!.full_name, avatar_url: u!.avatar_url }))}
        canEdit={true}
        currentUserId={hubUser?.id ?? ''}
        currentUserName={hubUser?.full_name ?? 'Admin'}
        currentUserAvatarUrl={hubUser?.avatar_url ?? null}
      />
    </AdminLayout>
  );
}
