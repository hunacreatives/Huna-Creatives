
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navigation from '../../components/feature/Navigation';
import ContactFooter from '../contact/components/ContactFooter';
import ProjectHero from './components/ProjectHero';
import ProjectInfo from './components/ProjectInfo';
import ProjectLocation from './components/ProjectLocation';
import NextProject from './components/NextProject';

const projectsData = [
  {
    id: 1,
    slug: 'metropolitan-healthcare-center',
    translationKey: 'metropolitan_healthcare_center',
    year: '2023',
    location: 'Manila',
    lat: 14.5547,
    lng: 121.0244,
    heroImage: '/images/hero1.jpg',
    mainImage: '/images/main1.jpg',
    gallery: [
      '/images/gal1a.jpg',
      '/images/gal1b.jpg',
      '/images/gal1c.jpg',
      '/images/gal1d.jpg',
      '/images/gal1e.jpg',
    ],
    floorPlanImages: [
      '/images/fp1a.jpg',
      '/images/fp1b.jpg',
      '/images/fp1c.jpg',
    ],
  },
  {
    id: 2,
    slug: 'coastal-resort-spa',
    translationKey: 'coastal_resort_spa',
    year: '2023',
    location: 'Leyte',
    lat: 11.2442,
    lng: 124.9999,
    heroImage: '/images/hero2.jpg',
    mainImage: '/images/main2.jpg',
    gallery: [
      '/images/gal2a.jpg',
      '/images/gal2b.jpg',
      '/images/gal2c.jpg',
      '/images/gal2d.jpg',
      '/images/gal2e.jpg',
    ],
    floorPlanImages: [
      '/images/fp2a.jpg',
      '/images/fp2b.jpg',
      '/images/fp2c.jpg',
    ],
  },
  {
    id: 3,
    slug: 'urban-living-complex',
    translationKey: 'urban_living_complex',
    year: '2022',
    location: 'Cebu',
    lat: 10.3157,
    lng: 123.8854,
    heroImage: 'https://placehold.co/800x600/1a1a1a/444444se%20building%20with%20residential%20and%20commercial%20spaces%2C%20minimalist%20facade%20design%2C%20urban%20background%2C%20architectural%20photography%20style%2C%20modern%20materials%2C%20clean%20composition%2C%20wide%20angle%20view&width=1600&height=900&seq=hero3&orientation=landscape',
    mainImage: '/images/main3.jpg',
    gallery: [
      'https://placehold.co/800x600/1a1a1a/444444se%20building%20lobby%20interior%20with%20modern%20design%20and%20natural%20light%2C%20architectural%20photography&width=400&height=300&seq=gal3a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444scaping%2C%20minimalist%20design&width=400&height=300&seq=gal3b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444sidential%20tower%20facade%20detail%20with%20balconies%20and%20modern%20materials%2C%20architectural%20photography&width=400&height=300&seq=gal3c&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444strian%20arcade%2C%20urban%20design&width=400&height=300&seq=gal3d&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444se%20building%20with%20city%20views%2C%20modern%20design&width=400&height=300&seq=gal3e&orientation=landscape',
    ],
    floorPlanImages: [
      'https://placehold.co/800x600/1a1a1a/444444se%20building%20ground%20floor%2C%20clean%20technical%20drawing%20on%20white%20background%2C%20minimalist%20blueprint%20style&width=600&height=400&seq=fp3a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444sidential%20tower%20typical%20floor%2C%20clean%20technical%20drawing%20on%20white%20background%2C%20minimalist%20blueprint%20style&width=600&height=400&seq=fp3b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20blueprint%20style&width=600&height=400&seq=fp3c&orientation=landscape',
    ],
  },
  {
    id: 4,
    slug: 'tech-hub-office-tower',
    translationKey: 'tech_hub_office_tower',
    year: '2023',
    location: 'Manila',
    lat: 14.5502,
    lng: 121.0485,
    heroImage: '/images/hero4.jpg',
    mainImage: '/images/main4.jpg',
    gallery: [
      '/images/gal4a.jpg',
      '/images/gal4b.jpg',
      '/images/gal4c.jpg',
      '/images/gal4d.jpg',
      '/images/gal4e.jpg',
    ],
    floorPlanImages: [
      '/images/fp4a.jpg',
      '/images/fp4b.jpg',
      '/images/fp4c.jpg',
    ],
  },
  {
    id: 5,
    slug: 'hillside-residences',
    translationKey: 'hillside_residences',
    year: '2022',
    location: 'Davao',
    lat: 7.1907,
    lng: 125.4553,
    heroImage: 'https://placehold.co/800x600/1a1a1a/444444st%20residential%20building%20with%20clean%20geometric%20forms%2C%20natural%20hillside%20background%2C%20architectural%20photography%20style%2C%20contemporary%20housing%20design%2C%20soft%20natural%20lighting%2C%20wide%20panoramic%20view&width=1600&height=900&seq=hero5&orientation=landscape',
    mainImage: '/images/main5.jpg',
    gallery: [
      'https://placehold.co/800x600/1a1a1a/444444sidential%20building%20terrace%20with%20city%20views%20and%20natural%20materials%2C%20minimalist%20design&width=400&height=300&seq=gal5a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444sidential%20interior%20with%20natural%20light%20and%20minimalist%20design%2C%20architectural%20photography&width=400&height=300&seq=gal5b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444sidential%20building%20facade%20with%20board-formed%20concrete%20and%20wood%20details%2C%20architectural%20photography&width=400&height=300&seq=gal5c&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444side%20residential%20complex%20with%20terraced%20design%20and%20natural%20landscape&width=400&height=300&seq=gal5d&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444sidential%20common%20area%20with%20natural%20materials%20and%20greenery%2C%20minimalist%20design&width=400&height=300&seq=gal5e&orientation=landscape',
    ],
    floorPlanImages: [
      'https://placehold.co/800x600/1a1a1a/444444site%20plan%20drawing%20of%20hillside%20residential%20complex%2C%20clean%20technical%20drawing%20on%20white%20background%2C%20minimalist%20blueprint%20style&width=600&height=400&seq=fp5a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444sidential%20unit%2C%20clean%20technical%20drawing%20on%20white%20background%2C%20minimalist%20blueprint%20style&width=600&height=400&seq=fp5b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20blueprint%20style&width=600&height=400&seq=fp5c&orientation=landscape',
    ],
  },
  {
    id: 6,
    slug: 'lifestyle-shopping-district',
    translationKey: 'lifestyle_shopping_district',
    year: '2023',
    location: 'CDO',
    lat: 8.4542,
    lng: 124.6319,
    heroImage: 'https://placehold.co/800x600/1a1a1a/444444sign%2C%20minimalist%20commercial%20architecture%2C%20simple%20background%2C%20architectural%20photography%2C%20modern%20shopping%20center%2C%20bright%20daylight%2C%20wide%20angle%20view&width=1600&height=900&seq=hero6&orientation=landscape',
    mainImage: '/images/main6.jpg',
    gallery: [
      'https://placehold.co/800x600/1a1a1a/444444scaping%2C%20architectural%20photography&width=400&height=300&seq=gal6a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444sign%2C%20architectural%20photography&width=400&height=300&seq=gal6b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444shopping%20district%20promenade%20with%20trees%20and%20modern%20architecture%2C%20architectural%20photography&width=400&height=300&seq=gal6c&orientation=landscape',
      'https://placehold.co/400x300/1a1a1a/444444seq=gal6d&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444s%2C%20architectural%20photography&width=400&height=300&seq=gal6e&orientation=landscape',
    ],
    floorPlanImages: [
      'https://placehold.co/800x600/1a1a1a/444444site%20plan%20drawing%20of%20retail%20district%2C%20clean%20technical%20drawing%20on%20white%20background%2C%20minimalist%20blueprint%20style&width=600&height=400&seq=fp6a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20blueprint%20style&width=600&height=400&seq=fp6b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20blueprint%20style&width=600&height=400&seq=fp6c&orientation=landscape',
    ],
  },
  {
    id: 7,
    slug: 'executive-suite-interiors',
    translationKey: 'executive_suite_interiors',
    year: '2023',
    location: 'Manila',
    lat: 14.5547,
    lng: 121.0244,
    heroImage: 'https://placehold.co/800x600/1a1a1a/444444st%20modern%20interior%20space%20with%20clean%20lines%20and%20natural%20materials%2C%20simple%20elegant%20design%2C%20architectural%20interior%20photography%2C%20contemporary%20executive%20office%20interior%2C%20soft%20ambient%20lighting%2C%20wide%20view&width=1600&height=900&seq=hero7&orientation=landscape',
    mainImage: '/images/main7.jpg',
    gallery: [
      'https://placehold.co/800x600/1a1a1a/444444ss%20details%2C%20minimalist%20design&width=400&height=300&seq=gal7a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444s%2C%20minimalist%20design&width=400&height=300&seq=gal7b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20design%20and%20natural%20materials&width=400&height=300&seq=gal7c&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444stom%20furniture%20and%20art%2C%20minimalist%20design&width=400&height=300&seq=gal7d&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20design%2C%20architectural%20photography&width=400&height=300&seq=gal7e&orientation=landscape',
    ],
    floorPlanImages: [
      'https://placehold.co/800x600/1a1a1a/444444suite%2C%20clean%20technical%20drawing%20on%20white%20background%2C%20minimalist%20blueprint%20style&width=600&height=400&seq=fp7a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20blueprint%20style&width=600&height=400&seq=fp7b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20blueprint%20style&width=600&height=400&seq=fp7c&orientation=landscape',
    ],
  },
  {
    id: 8,
    slug: 'waterfront-villas',
    translationKey: 'waterfront_villas',
    year: '2022',
    location: 'Zamboanga',
    lat: 6.9214,
    lng: 122.0790,
    heroImage: '/images/hero8.jpg',
    mainImage: '/images/main8.jpg',
    gallery: [
      '/images/gal8a.jpg',
      '/images/gal8b.jpg',
      '/images/gal8c.jpg',
      '/images/gal8d.jpg',
      '/images/gal8e.jpg',
    ],
    floorPlanImages: [
      '/images/fp8a.jpg',
      '/images/fp8b.jpg',
      '/images/fp8c.jpg',
    ],
  },
  {
    id: 9,
    slug: 'city-medical-plaza',
    translationKey: 'city_medical_plaza',
    year: '2022',
    location: 'Cebu',
    lat: 10.3157,
    lng: 123.8854,
    heroImage: 'https://placehold.co/800x600/1a1a1a/444444ss%20elements%2C%20minimalist%20medical%20building%20design%2C%20simple%20background%2C%20architectural%20photography%2C%20professional%20composition%2C%20wide%20angle%20view&width=1600&height=900&seq=hero9&orientation=landscape',
    mainImage: '/images/main9.jpg',
    gallery: [
      'https://placehold.co/800x600/1a1a1a/444444sign%2C%20architectural%20photography&width=400&height=300&seq=gal9a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444s%2C%20architectural%20photography&width=400&height=300&seq=gal9b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20design&width=400&height=300&seq=gal9c&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444se-soleil%20system%2C%20architectural%20photography&width=400&height=300&seq=gal9d&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444sign%20and%20natural%20materials&width=400&height=300&seq=gal9e&orientation=landscape',
    ],
    floorPlanImages: [
      'https://placehold.co/800x600/1a1a1a/444444st%20blueprint%20style&width=600&height=400&seq=fp9a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444second%20floor%2C%20clean%20technical%20drawing%20on%20white%20background%2C%20minimalist%20blueprint%20style&width=600&height=400&seq=fp9b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444section%20drawing%20of%20medical%20building%20atrium%2C%20clean%20technical%20drawing%20on%20white%20background%2C%20minimalist%20blueprint%20style&width=600&height=400&seq=fp9c&orientation=landscape',
    ],
  },
  {
    id: 10,
    slug: 'boutique-hotel-downtown',
    translationKey: 'boutique_hotel_downtown',
    year: '2023',
    location: 'Manila',
    lat: 14.5995,
    lng: 120.9842,
    heroImage: '/images/hero10.jpg',
    mainImage: '/images/main10.jpg',
    gallery: [
      '/images/gal10a.jpg',
      '/images/gal10b.jpg',
      '/images/gal10c.jpg',
      '/images/gal10d.jpg',
      '/images/gal10e.jpg',
    ],
    floorPlanImages: [
      '/images/fp10a.jpg',
      '/images/fp10b.jpg',
      '/images/fp10c.jpg',
    ],
  },
  {
    id: 11,
    slug: 'innovation-campus',
    translationKey: 'innovation_campus',
    year: '2023',
    location: 'Davao',
    lat: 7.1907,
    lng: 125.4553,
    heroImage: 'https://placehold.co/800x600/1a1a1a/444444s%20building%20with%20mixed-use%20design%2C%20minimalist%20contemporary%20architecture%2C%20simple%20landscape%20background%2C%20architectural%20photography%2C%20clean%20geometric%20forms%2C%20wide%20angle%20view&width=1600&height=900&seq=hero11&orientation=landscape',
    mainImage: '/images/main11.jpg',
    gallery: [
      'https://placehold.co/800x600/1a1a1a/444444s%20central%20green%20spine%20with%20modern%20buildings%2C%20architectural%20photography&width=400&height=300&seq=gal11a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444s%20laboratory%20building%20interior%20with%20modern%20design%20and%20natural%20light&width=400&height=300&seq=gal11b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444s%20covered%20walkway%20with%20exposed%20concrete%20and%20steel%2C%20architectural%20photography&width=400&height=300&seq=gal11c&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444s%20outdoor%20collaboration%20space%20with%20modern%20architecture&width=400&height=300&seq=gal11d&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444s%20building%20facade%20with%20exposed%20concrete%20and%20glazing%2C%20architectural%20photography&width=400&height=300&seq=gal11e&orientation=landscape',
    ],
    floorPlanImages: [
      'https://placehold.co/800x600/1a1a1a/444444sterplan%20drawing%20of%20innovation%20campus%2C%20clean%20technical%20drawing%20on%20white%20background%2C%20minimalist%20blueprint%20style&width=600&height=400&seq=fp11a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20blueprint%20style&width=600&height=400&seq=fp11b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444studio%20building%2C%20clean%20technical%20drawing%20on%20white%20background%2C%20minimalist%20blueprint%20style&width=600&height=400&seq=fp11c&orientation=landscape',
    ],
  },
  {
    id: 12,
    slug: 'corporate-headquarters',
    translationKey: 'corporate_headquarters',
    year: '2022',
    location: 'Manila',
    lat: 14.5547,
    lng: 121.0244,
    heroImage: 'https://placehold.co/800x600/1a1a1a/444444stigious%20office%20building%20with%20minimalist%20glass%20and%20steel%20facade%2C%20simple%20sky%20background%2C%20architectural%20photography%20style%2C%20contemporary%20corporate%20design%2C%20professional%20composition%2C%20wide%20angle%20full%20building%20view&width=1600&height=900&seq=hero12&orientation=landscape',
    mainImage: '/images/main12.jpg',
    gallery: [
      'https://placehold.co/800x600/1a1a1a/444444s%20lobby%20with%20premium%20materials%20and%20modern%20design%2C%20architectural%20photography&width=400&height=300&seq=gal12a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444solar%20shading%20fins%2C%20architectural%20photography&width=400&height=300&seq=gal12b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444shes%20and%20natural%20light%2C%20architectural%20photography&width=400&height=300&seq=gal12c&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444s%2C%20architectural%20photography&width=400&height=300&seq=gal12d&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444s%20executive%20floor%20with%20panoramic%20city%20views%2C%20modern%20design&width=400&height=300&seq=gal12e&orientation=landscape',
    ],
    floorPlanImages: [
      'https://placehold.co/800x600/1a1a1a/444444s%20ground%20floor%2C%20clean%20technical%20drawing%20on%20white%20background%2C%20minimalist%20blueprint%20style&width=600&height=400&seq=fp12a&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20blueprint%20style&width=600&height=400&seq=fp12b&orientation=landscape',
      'https://placehold.co/800x600/1a1a1a/444444st%20blueprint%20style&width=600&height=400&seq=fp12c&orientation=landscape',
    ],
  },
];

export { projectsData };

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const project = projectsData.find((p) => p.slug === slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!project) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-black/40 text-sm mb-4" style={{ fontFamily: 'Geist, sans-serif' }}>
            {t('detail_not_found')}
          </p>
          <button
            onClick={() => navigate('/projects')}
            className="text-black text-sm underline cursor-pointer"
            style={{ fontFamily: 'Geist, sans-serif' }}
          >
            {t('detail_back_link')}
          </button>
        </div>
      </div>
    );
  }

  const tk = project.translationKey;
  const name = t(`proj_${tk}_name`);
  const address = t(`proj_${tk}_address`);
  const category = t(`proj_${tk}_category`);
  const description = t(`proj_${tk}_description`);
  const floorPlans = project.floorPlanImages.map((img, i) => ({
    label: t(`proj_${tk}_fp${i}`),
    image: img,
  }));

  const currentIndex = projectsData.findIndex((p) => p.slug === slug);
  const nextProject = projectsData[(currentIndex + 1) % projectsData.length];
  const prevProject = projectsData[(currentIndex - 1 + projectsData.length) % projectsData.length];
  const nextName = t(`proj_${nextProject.translationKey}_name`);
  const prevName = t(`proj_${prevProject.translationKey}_name`);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navigation theme="dark" />

      <ProjectHero
        name={name}
        address={address}
        category={category}
        image={project.heroImage}
      />

      <ProjectInfo
        name={name}
        address={address}
        year={project.year}
        description={description}
        mainImage={project.mainImage}
        galleryImages={project.gallery}
        plans={floorPlans}
      />

      <div className="pb-8 md:pb-14" />

      <ProjectLocation
        lat={project.lat}
        lng={project.lng}
        name={name}
      />

      <NextProject
        slug={nextProject.slug}
        name={nextName}
        location={nextProject.location}
        heroImage={nextProject.heroImage}
        prevSlug={prevProject.slug}
        prevName={prevName}
      />

      <ContactFooter />
    </div>
  );
}
