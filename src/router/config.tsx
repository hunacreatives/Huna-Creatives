import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

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
const HubAdminSop = lazy(() => import('../pages/hub/admin/sop/page'));
const HubAdminClients = lazy(() => import('../pages/hub/admin/clients/page'));
const HubAdminAssets = lazy(() => import('../pages/hub/admin/assets/page'));
const HubAdminAuditLog = lazy(() => import('../pages/hub/admin/auditlog/page'));
const HubAdminSettings = lazy(() => import('../pages/hub/admin/settings/page'));
const HubAdminPayroll = lazy(() => import('../pages/hub/admin/payroll/page'));
const HubAdminPayouts = lazy(() => import('../pages/hub/admin/payouts/page'));
const HubAdminDocRequests = lazy(() => import('../pages/hub/admin/docrequests/page'));
const HubContractorDashboard = lazy(() => import('../pages/hub/contractor/dashboard/page'));
const HubContractorAttendance = lazy(() => import('../pages/hub/contractor/attendance/page'));
const HubContractorRequests = lazy(() => import('../pages/hub/contractor/requests/page'));
const HubContractorTimeOff = lazy(() => import('../pages/hub/contractor/timeoff/page'));
const HubContractorSop = lazy(() => import('../pages/hub/contractor/sop/page'));
const HubContractorAnnouncements = lazy(() => import('../pages/hub/contractor/announcements/page'));
const HubContractorProfile = lazy(() => import('../pages/hub/contractor/profile/page'));
const HubContractorPayouts = lazy(() => import('../pages/hub/contractor/payouts/page'));
const HubContractorDocuments = lazy(() => import('../pages/hub/contractor/documents/page'));
const HubAdminCredentials = lazy(() => import('../pages/hub/admin/credentials/page'));
const HubContractorCredentials = lazy(() => import('../pages/hub/contractor/credentials/page'));
const HubAdminOvertime = lazy(() => import('../pages/hub/admin/overtime/page'));
const HubContractorOvertime = lazy(() => import('../pages/hub/contractor/overtime/page'));
const HubContractorOnboarding = lazy(() => import('../pages/hub/contractor/onboarding/page'));
const HubContractorClients = lazy(() => import('../pages/hub/contractor/clients/page'));
const HubContractorProjects = lazy(() => import('../pages/hub/contractor/projects/page'));
const HubAdminProjects = lazy(() => import('../pages/hub/admin/projects/page'));
const HubAdminDocuments = lazy(() => import('../pages/hub/admin/documents/page'));
const HubAdminQuestionnaires = lazy(() => import('../pages/hub/admin/questionnaires/page'));
const PublicQuestionnaire = lazy(() => import('../pages/q/page'));
const ForAgenciesPage = lazy(() => import('../pages/for-agencies/page'));

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
  { path: '/hub/admin/dashboard', element: <HubAdminDashboard /> },
  { path: '/hub/admin/contractors', element: <HubAdminContractors /> },
  { path: '/hub/admin/contractors/:id', element: <HubAdminContractorDetail /> },
  { path: '/hub/admin/attendance', element: <HubAdminAttendance /> },
  { path: '/hub/admin/requests', element: <HubAdminRequests /> },
  { path: '/hub/admin/timeoff', element: <HubAdminTimeOff /> },
  { path: '/hub/admin/announcements', element: <HubAdminAnnouncements /> },
  { path: '/hub/admin/sop', element: <HubAdminSop /> },
  { path: '/hub/admin/clients', element: <HubAdminClients /> },
  { path: '/hub/admin/assets', element: <HubAdminAssets /> },
  { path: '/hub/admin/auditlog', element: <HubAdminAuditLog /> },
  { path: '/hub/admin/settings', element: <HubAdminSettings /> },
  { path: '/hub/admin/payroll', element: <HubAdminPayroll /> },
  { path: '/hub/admin/payouts', element: <HubAdminPayouts /> },
  { path: '/hub/admin/docrequests', element: <HubAdminDocRequests /> },
  { path: '/hub/admin/credentials', element: <HubAdminCredentials /> },
  { path: '/hub/contractor/dashboard', element: <HubContractorDashboard /> },
  { path: '/hub/contractor/attendance', element: <HubContractorAttendance /> },
  { path: '/hub/contractor/requests', element: <HubContractorRequests /> },
  { path: '/hub/contractor/timeoff', element: <HubContractorTimeOff /> },
  { path: '/hub/contractor/sop', element: <HubContractorSop /> },
  { path: '/hub/contractor/announcements', element: <HubContractorAnnouncements /> },
  { path: '/hub/contractor/profile', element: <HubContractorProfile /> },
  { path: '/hub/contractor/payouts', element: <HubContractorPayouts /> },
  { path: '/hub/contractor/documents', element: <HubContractorDocuments /> },
  { path: '/hub/contractor/credentials', element: <HubContractorCredentials /> },
  { path: '/hub/contractor/overtime', element: <HubContractorOvertime /> },
  { path: '/hub/contractor/onboarding', element: <HubContractorOnboarding /> },
  { path: '/hub/contractor/clients', element: <HubContractorClients /> },
  { path: '/hub/contractor/projects', element: <HubContractorProjects /> },
  { path: '/hub/admin/projects', element: <HubAdminProjects /> },
  { path: '/hub/admin/overtime', element: <HubAdminOvertime /> },
  { path: '/hub/admin/documents', element: <HubAdminDocuments /> },
  { path: '/hub/admin/questionnaires', element: <HubAdminQuestionnaires /> },
  { path: '/q/:token', element: <PublicQuestionnaire /> },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
