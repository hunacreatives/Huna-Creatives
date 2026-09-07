// Question templates used by accept-quotation to auto-create a client
// questionnaire when a proposal carries an `intake_template`.
//
// KEEP IN SYNC with src/pages/hub/admin/questionnaires/page.tsx (TEMPLATES).
// One template, changes rarely — a shared import across the Vite build and
// the Deno functions is not worth the path gymnastics.

export interface TplQuestion {
  id: string;
  type: 'short_text' | 'paragraph' | 'single_choice' | 'multi_choice' | 'file_upload' | 'date';
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
}

const partnerShopify: TplQuestion[] = [
  { id: 'client_brand', type: 'short_text', label: 'Client / brand name', required: true },
  { id: 'client_url', type: 'short_text', label: 'Current website, if any', placeholder: 'https://...' },
  { id: 'sells', type: 'paragraph', label: 'What does the brand sell? One or two lines.', required: true },
  { id: 'customer', type: 'paragraph', label: 'Who is the customer?' },
  { id: 'product_count', type: 'single_choice', label: 'Roughly how many products at launch?', options: ['Under 10', '10–30', '30–75', '75–150', '150+'], required: true },
  { id: 'collections', type: 'single_choice', label: 'Are product collections / categories defined?', options: ['Yes, defined', 'Rough idea', "We'd like Huna to propose them"] },
  { id: 'photos_status', type: 'single_choice', label: 'Product photography status', options: ['Ready — link below', 'Being shot now', 'Not started'], required: true },
  { id: 'photos_link', type: 'short_text', label: 'Link to product photos and assets folder', description: 'Drive, Dropbox, etc. — DOBO supplies the shots; we place them.' },
  { id: 'copy_owner', type: 'single_choice', label: 'Who writes the product and page copy?', options: ['DOBO', 'The client', 'Huna to assist'] },
  { id: 'brand_assets', type: 'short_text', label: 'Brand assets — logo, fonts, colours, guidelines (link)' },
  { id: 'pages', type: 'multi_choice', label: 'Pages you want', options: ['Home', 'Shop / collections', 'Product page', 'About', 'Contact', 'Blog / journal', 'FAQ', 'Lookbook / gallery', 'Wholesale / B2B', 'Other'], required: true },
  { id: 'references', type: 'paragraph', label: '2–5 store sites you like, and what you like about them' },
  { id: 'custom_features', type: 'multi_choice', label: 'Any custom functionality beyond a standard store?', options: ['None', 'Subscriptions', 'Bundles / kits', 'Product quiz / finder', 'Loyalty / rewards', 'Wholesale / B2B pricing', 'Gift cards', 'Multi-currency or multi-language', 'Other'] },
  { id: 'custom_features_detail', type: 'paragraph', label: 'If you selected anything above, describe how it should work' },
  { id: 'shopify_account', type: 'single_choice', label: 'Shopify store status', options: ["Already created — we'll get collaborator access", 'Client will create it', 'Huna to set it up'], required: true },
  { id: 'domain', type: 'single_choice', label: 'Domain', options: ["Registered — we'll point it", 'Need to buy one', 'Using a subdomain for now'], required: true },
  { id: 'domain_name', type: 'short_text', label: 'The domain name, if you have one', placeholder: 'brand.com' },
  { id: 'payments', type: 'multi_choice', label: 'Payment methods to enable', options: ['Cards (Shopify Payments)', 'GCash', 'Maya', 'PayPal', 'Shop Pay', 'Bank transfer', 'Cash on delivery', 'Other'] },
  { id: 'shipping_regions', type: 'short_text', label: 'Where does the brand ship?' },
  { id: 'shipping_model', type: 'single_choice', label: 'Shipping rates', options: ['Flat rate', 'By weight', 'By region', 'Free over a threshold', 'Not sure yet'] },
  { id: 'existing_apps', type: 'paragraph', label: 'Any Shopify apps already in use that must carry over?' },
  { id: 'launch_date', type: 'date', label: 'Target launch date' },
  { id: 'point_of_contact', type: 'short_text', label: 'Main point of contact and who signs off', required: true },
  { id: 'white_label', type: 'single_choice', label: "Deliver white-label under DOBO's name?", options: ['Yes', 'No', 'Partly'], required: true },
  { id: 'anything_else', type: 'paragraph', label: 'Anything else we should know?' },
];

export const QUESTIONNAIRE_TEMPLATES: Record<string, TplQuestion[]> = {
  'Partner — Shopify Store Build': partnerShopify,
};
