-- Fix admin name and set avatar from About page photo
UPDATE hub_users
SET
  full_name  = 'Francis Fiel Roble',
  avatar_url = 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/4ea0f3e2-5d0d-4fbd-b1e8-e899bd2b7ea4/Francis+Fiel+Roble',
  updated_at = now()
WHERE email = 'francisfielroble@gmail.com';
