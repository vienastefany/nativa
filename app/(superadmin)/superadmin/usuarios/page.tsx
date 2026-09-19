import UsuariosList from "@/components/usuarios/UsuariosList";

export default function SuperAdminUsuariosPage() {
  return (
    <UsuariosList
      apiOrganizaciones="/api/superadmin/organizaciones"
      showOrgFilter
      editable
    />
  );
}