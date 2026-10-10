import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminRole } from '@/lib/hubAuth';

// Shared SOP links (/hub/sop/:id) work for everyone: admins land on the admin
// library, employees on theirs, each with the SOP open.
export default function SopLinkRedirect() {
  const { id } = useParams<{ id: string }>();
  const { effectiveRole } = useAuth();
  const base = isAdminRole(effectiveRole) ? '/hub/admin/sop' : '/hub/contractor/sop';
  const sopId = Number(id);
  return <Navigate to={Number.isInteger(sopId) && sopId > 0 ? `${base}?open=${sopId}` : base} replace />;
}
