export interface TeamMember {
  name: string;
  title: string;
  department: string;
  avatar: string;
  email?: string;
  slackName?: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Francis Fiel Roble',
    title: 'Founder/Creative Director',
    department: 'Management',
    avatar: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/4ea0f3e2-5d0d-4fbd-b1e8-e899bd2b7ea4/Francis+Fiel+Roble',
    email: 'francisfielroble@gmail.com',
  },
  {
    name: 'Thamara Ong',
    title: 'Partner & Senior Brand Strategist',
    department: 'Management',
    avatar: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/c2dcdf7b-60dc-456d-9a36-2b105fab1551/Thamara+Ong',
  },
  {
    name: 'Ma. Reeva Jumawan',
    title: 'Partner & Senior Visual Director',
    department: 'Creative',
    avatar: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/92579145-71f3-43d0-9b81-41c9a60f82d8/Reeva+Jumawan',
    email: 'reevajumawan@gmail.com',
  },
  {
    name: 'Katleen Nellas',
    title: 'Senior Graphic Designer',
    department: 'Creative',
    avatar: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/faec8908-b5d8-4696-9701-826dce495457/Katleen+Nellas',
    email: 'nellaskatleen@gmail.com',
  },
  {
    name: 'Abigail Duterte',
    title: 'HR Specialist / Admin',
    department: 'Admin',
    avatar: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/399d867a-4c64-4366-ae66-ee8752bc4a7f/Abigail+Duterte',
    email: 'duterteabigaile@gmail.com',
  },
  {
    name: 'Angela Louise Ando',
    title: 'Admin / Account Specialist',
    department: 'Account Management',
    avatar: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/567bc5cd-ef1c-4efa-9fca-25c37e13ff02/Angela+Ando',
    email: 'angelalouiseando@gmail.com',
  },
  {
    name: 'Claudette Tahil',
    title: 'Admin / Account Specialist',
    department: 'Account Management',
    avatar: '/images/6785570f89c09728ca73acf4660742b6.png',
    email: 'claudettemaytahil@gmail.com',
    slackName: 'Claudy Tahil',
  },
  {
    name: 'Reese Jumawan',
    title: 'Junior Graphic Designer',
    department: 'Creative',
    avatar: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/bf9d33e6-e10b-4f2d-9f05-2312e1695007/Reese+Jumawan',
    email: 'janreesepj@gmail.com',
    slackName: 'Bing',
  },
  {
    name: 'Dan',
    title: 'Web Designer',
    department: 'Tech',
    avatar: '',
  },
];
