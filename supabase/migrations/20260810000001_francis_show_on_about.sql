-- Francis (owner) currently doesn't appear on the public About page / homepage
-- team teaser because his hub_users row has show_on_about = false (or unset).
update hub_users
set show_on_about = true
where full_name ilike '%francis%fiel%roble%'
   or full_name ilike '%francis%roble%';
