import ContactListPage from '@/components/ContactListPage';
import { clientsApi } from '@/lib/api';

const ClientsPage = () => (
  <ContactListPage title="Clients" subtitle="Gérez vos clients" api={clientsApi} />
);

export default ClientsPage;
