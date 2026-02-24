import ContactListPage from '@/components/ContactListPage';
import { fournisseursApi } from '@/lib/api';

const SuppliersPage = () => (
  <ContactListPage title="Fournisseurs" subtitle="Gérez vos fournisseurs" api={fournisseursApi} />
);

export default SuppliersPage;
