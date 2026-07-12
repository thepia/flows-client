// Public exports for client domain

export { ClientService } from './client.service';
export { clientStore, loadAllClients, refreshCurrentClient, selectClient } from './client.store';
export type { Client, ClientActions, ClientState, ClientStore } from './client.types';
