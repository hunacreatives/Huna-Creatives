import { lazy, ReactNode } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';
import HubRouteGate from '@/components/feature/HubRouteGate';

const HomePage = lazy(() => import('../pages/home/page'));
const AboutPage = lazy(() => import('../pages/about/page'));
const ServicesPage = lazy(() => import('../pages/services/page'));
const ContactPage = lazy(() => import('../pages/contact/page'));
const BlogPage = lazy(() => import('../pages/blog/page'));
const ArticlePage = lazy(() => import('../pages/blog/article/page'));
const CareersPage = lazy(() => import('../pages/careers/page'));
const PortfolioPage = lazy(() => import('../pages/portfolio/page'));
const PortfolioCategoryPage = lazy(() => import('../pages/portfolio/category/page'));
const ProjectPage = lazy(() => import('../pages/portfolio/project/page'));
const NotFound = lazy(() => import('../pages/NotFound'));
const HubLoginPage = lazy(() => import('../pages/hub/login/page'));
const HubSignupPage = lazy(() => import('../pages/hub/signup/page'));
const HubForgotPasswordPage = lazy(() => import('../pages/hub/forgot-password/page'));
const HubResetPasswordPage = lazy(() => import('../pages/hub/reset-password/page'));
const HubAdminDashboard = lazy(() => import('../pages/hub/admin/dashboard/page'));
const HubAdminContractors = lazy(() => import('../pages/hub/admin/contractors/page'));
const HubAdminContractorDetail = lazy(() => import('../pages/hub/admin/contractors/detail/page'));
const HubAdminAttendance = lazy(() => import('../pages/hub/admin/attendance/page'));
const HubAdminRequests = lazy(() => import('../pages/hub/admin/requests/page'));
const HubAdminTimeOff = lazy(() => import('../pages/hub/admin/timeoff/page'));
const HubAdminAnnouncements = lazy(() => import('../pages/hub/admin/announcements/page'));
const HubContractorMyRequests = lazy(() => import('../pages/hub/contractor/my-requests/page'));
const HubAdminSop = lazy(() => import('../pages/hub/admin/sop/page'));
const HubAdminAssets = lazy(() => import('../pages/hub/admin/assets/page'));
const HubAdminAuditLog = lazy(() => import('../pages/hub/admin/auditlog/page'));
const HubAdminSettings = lazy(() => import('../pages/hub/admin/settings/page'));
const HubAdminPayroll = lazy(() => import('../pages/hub/admin/payroll/page'));
const HubAdminPayouts = lazy(() => import('../pages/hub/admin/payouts/page'));
const HubAdminDocRequests = lazy(() => import('../pages/hub/admin/docrequests/page'));
const HubAdminInvoiceBuilder = lazy(() => import('../pages/hub/admin/invoice-builder/page'));
const HubContractorDashboard = lazy(() => import('../pages/hub/contractor/dashboard/page'));
const HubContractorAttendance = lazy(() => import('../pages/hub/contractor/attendance/page'));
const HubContractorSop = lazy(() => import('../pages/hub/contractor/sop/page'));
const HubContractorProfile = lazy(() => import('../pages/hub/contractor/profile/page'));
const HubContractorPayouts = lazy(() => import('../pages/hub/contractor/payouts/page'));
const HubContractorDocuments = lazy(() => import('../pages/hub/contractor/documents/page'));
const HubAdminCredentials = lazy(() => import('../pages/hub/admin/credentials/page'));
const HubAdminPerformance = lazy(() => import('../pages/hub/admin/performance/page'));
const HubContractorCredentials = lazy(() => import('../pages/hub/contractor/credentials/page'));
const HubContractorOnboarding = lazy(() => import('../pages/hub/contractor/onboarding/page'));
const HubContractorProjects = lazy(() => import('../pages/hub/contractor/projects/page'));
const HubContractorProjectRedirect = lazy(() => import('../pages/hub/contractor/project-redirect/page'));
const HubAdminProjects = lazy(() => import('../pages/hub/admin/projects/page'));
const HubAdminProjectRedirect = lazy(() => import('../pages/hub/admin/project-redirect/page'));
const HubAdminTasks = lazy(() => import('../pages/hub/admin/tasks/page'));
const HubAdminRevenue = lazy(() => import('../pages/hub/admin/revenue/page'));
const HubAdminDocuments = lazy(() => import('../pages/hub/admin/documents/page'));
const HubAdminInvoiceLog = lazy(() => import('../pages/hub/admin/invoice-log/page'));
const HubAdminQuestionnaires = lazy(() => import('../pages/hub/admin/questionnaires/page'));
const HubAdminApplications = lazy(() => import('../pages/hub/admin/applications/page'));
const HubAdminContact = lazy(() => import('../pages/hub/admin/contact/page'));
const HubAdminClaudyRsvps = lazy(() => import('../pages/hub/admin/claudy-rsvps/page'));
const HubAdminRsvpsIndex = lazy(() => import('../pages/hub/admin/rsvps/page'));
const HubAdminProposalBuilder = lazy(() => import('../pages/hub/admin/proposals/page'));
const PublicProposalPage = lazy(() => import('../pages/p/page'));
const ProposalCapuCoffee = lazy(() => import('../pages/p/capu-coffee/page'));
const ProposalCapuCoffeeApprove = lazy(() => import('../pages/p/capu-coffee/approve/page'));
const PublicQuestionnaire = lazy(() => import('../pages/q/page'));
const ClientStatusPage = lazy(() => import('../pages/status/page'));
const PublicPaymentPage = lazy(() => import('../pages/pay/page'));
const ForAgenciesPage = lazy(() => import('../pages/for-agencies/page'));
const HubDemoPage = lazy(() => import('../pages/hub/demo/page'));
const ClientContractPage = lazy(() => import('../pages/c/page'));
const ClientContractSignPage = lazy(() => import('../pages/c/sign/page'));

const withAdminGate = (element: ReactNode) => (
  <HubRouteGate allowedRoles={['owner', 'admin', 'hr']}>{element}</HubRouteGate>
);

const withContractorGate = (element: ReactNode) => (
  <HubRouteGate allowedRoles={['contractor']}>{element}</HubRouteGate>
);

const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/for-agencies',
    element: <ForAgenciesPage />,
  },
  {
    path: '/crewly',
    element: <ForAgenciesPage />,
  },
  {
    path: '/sentro',
    element: <ForAgenciesPage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/services',
    element: <ServicesPage />,
  },
  {
    path: '/portfolio',
    element: <PortfolioPage />,
  },
  {
    path: '/portfolio/:categoryId',
    element: <PortfolioCategoryPage />,
  },
  {
    path: '/portfolio/project/:projectSlug',
    element: <ProjectPage />,
  },
  {
    path: '/contact',
    element: <ContactPage />,
  },
  {
    path: '/blog',
    element: <BlogPage />,
  },
  {
    path: '/blog/:slug',
    element: <ArticlePage />,
  },
  {
    path: '/careers',
    element: <CareersPage />,
  },
  { path: '/hub/login', element: <HubLoginPage /> },
  { path: '/hub/signup', element: <HubSignupPage /> },
  { path: '/hub/forgot-password', element: <HubForgotPasswordPage /> },
  { path: '/hub/reset-password', element: <HubResetPasswordPage /> },
  { path: '/hub/admin/dashboard', element: withAdminGate(<HubAdminDashboard />) },
  { path: '/hub/admin/contractors', element: withAdminGate(<HubAdminContractors />) },
  { path: '/hub/admin/contractors/:id', element: withAdminGate(<HubAdminContractorDetail />) },
  { path: '/hub/admin/attendance', element: withAdminGate(<HubAdminAttendance />) },
  { path: '/hub/admin/requests', element: withAdminGate(<HubAdminRequests />) },
  { path: '/hub/admin/timeoff', element: withAdminGate(<HubAdminTimeOff />) },
  { path: '/hub/admin/announcements', element: withAdminGate(<HubAdminAnnouncements />) },
  { path: '/hub/admin/sop', element: withAdminGate(<HubAdminSop />) },
  { path: '/hub/admin/assets', element: withAdminGate(<HubAdminAssets />) },
  { path: '/hub/admin/auditlog', element: withAdminGate(<HubAdminAuditLog />) },
  { path: '/hub/admin/performance', element: withAdminGate(<HubAdminPerformance />) },
  { path: '/hub/admin/settings', element: withAdminGate(<HubAdminSettings />) },
  { path: '/hub/admin/payroll', element: withAdminGate(<HubAdminPayroll />) },
  { path: '/hub/admin/payouts', element: withAdminGate(<HubAdminPayouts />) },
  { path: '/hub/admin/docrequests', element: withAdminGate(<HubAdminDocRequests />) },
  { path: '/hub/admin/invoices/:projectId', element: withAdminGate(<HubAdminInvoiceBuilder />) },
  { path: '/hub/admin/credentials', element: withAdminGate(<HubAdminCredentials />) },
  { path: '/hub/contractor/dashboard', element: withContractorGate(<HubContractorDashboard />) },
  { path: '/hub/contractor/attendance', element: withContractorGate(<HubContractorAttendance />) },
  { path: '/hub/contractor/my-requests', element: withContractorGate(<HubContractorMyRequests />) },
  { path: '/hub/contractor/requests', element: <Navigate to="/hub/contractor/my-requests" replace /> },
  { path: '/hub/contractor/timeoff', element: <Navigate to="/hub/contractor/my-requests" replace /> },
  { path: '/hub/contractor/sop', element: withContractorGate(<HubContractorSop />) },
  { path: '/hub/contractor/profile', element: withContractorGate(<HubContractorProfile />) },
  { path: '/hub/contractor/payouts', element: withContractorGate(<HubContractorPayouts />) },
  { path: '/hub/contractor/documents', element: withContractorGate(<HubContractorDocuments />) },
  { path: '/hub/contractor/credentials', element: withContractorGate(<HubContractorCredentials />) },
  { path: '/hub/contractor/overtime', element: <Navigate to="/hub/contractor/my-requests" replace /> },
  { path: '/hub/contractor/clients', element: <Navigate to="/hub/contractor/projects" replace /> },
  { path: '/hub/contractor/onboarding', element: withContractorGate(<HubContractorOnboarding />) },
  { path: '/hub/contractor/projects', element: withContractorGate(<HubContractorProjects />) },
  { path: '/hub/contractor/project/:slug', element: withContractorGate(<HubContractorProjectRedirect />) },
  { path: '/hub/admin/projects', element: withAdminGate(<HubAdminProjects />) },
  { path: '/hub/admin/revenue', element: withAdminGate(<HubAdminRevenue />) },
  { path: '/hub/admin/project/:slug', element: withAdminGate(<HubAdminProjectRedirect />) },
  { path: '/hub/admin/tasks', element: withAdminGate(<HubAdminTasks />) },
  { path: '/hub/admin/overtime', element: <Navigate to="/hub/admin/requests" replace /> },
  { path: '/hub/admin/documents', element: withAdminGate(<HubAdminDocuments />) },
  { path: '/hub/admin/invoice-log', element: withAdminGate(<HubAdminInvoiceLog />) },
  { path: '/hub/admin/questionnaires', element: withAdminGate(<HubAdminQuestionnaires />) },
  { path: '/hub/admin/applications', element: withAdminGate(<HubAdminApplications />) },
  { path: '/hub/admin/contact', element: withAdminGate(<HubAdminContact />) },
  { path: '/hub/admin/rsvps', element: withAdminGate(<HubAdminRsvpsIndex />) },
  { path: '/hub/admin/claudy-rsvps', element: withAdminGate(<HubAdminClaudyRsvps />) },
  { path: '/hub/admin/proposals/:id', element: withAdminGate(<HubAdminProposalBuilder />) },
  { path: '/hub/demo', element: <HubDemoPage /> },
  { path: '/p/capu-coffee', element: <ProposalCapuCoffee /> },
  { path: '/p/capu-coffee/approve', element: <ProposalCapuCoffeeApprove /> },
  { path: '/p/:slug', element: <PublicProposalPage /> },
  { path: '/q/:token', element: <PublicQuestionnaire /> },
  { path: '/pay/:token', element: <PublicPaymentPage /> },
  { path: '/status/:token', element: <ClientStatusPage /> },
  { path: '/c/:slug', element: <ClientContractPage /> },
  { path: '/c/:slug/sign', element: <ClientContractSignPage /> },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
