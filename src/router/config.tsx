import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const HomePage = lazy(() => import('../pages/home/page'));
const AboutPage = lazy(() => import('../pages/about/page'));
const PortfolioPage = lazy(() => import('../pages/portfolio/page'));
const PortfolioCategoryPage = lazy(() => import('../pages/portfolio/category/page'));
const ProjectPage = lazy(() => import('../pages/portfolio/project/page'));
const ServicesPage = lazy(() => import('../pages/services/page'));
const ContactPage = lazy(() => import('../pages/contact/page'));
const BlogPage = lazy(() => import('../pages/blog/page'));
const ArticlePage = lazy(() => import('../pages/blog/article/page'));
const CareersPage = lazy(() => import('../pages/careers/page'));
const NotFound = lazy(() => import('../pages/NotFound'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
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
    path: '/services',
    element: <ServicesPage />,
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
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;