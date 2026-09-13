import Dexie, { Table } from 'dexie';

export interface OfflineParcelRecord {
  id: string;
  name: string;
  category: string;
  ecozone: string;
  area_ha: number;
  geojson_geometry: any;
  predicted_crowns: any;
  cached_at: number;
}

export interface OfflineObservationRecord {
  id?: number;
  parcel_id: string;
  matched_tree_id?: string;
  latitude: number;
  longitude: number;
  species_identified: string;
  measured_dbh_cm: number;
  measured_height_m: number;
  edge_confidence: number;
  synced: boolean;
  timestamp: number;
}

export class KijaniOfflineDatabase extends Dexie {
  offlineParcels!: Table<OfflineParcelRecord, string>;
  offlineObservations!: Table<OfflineObservationRecord, number>;

  constructor() {
    super('KijaniOfflineDB');
    this.version(1).stores({
      offlineParcels: 'id, name, category, cached_at',
      offlineObservations: '++id, parcel_id, species_identified, synced, timestamp',
    });
  }
}

export const offlineDb = new KijaniOfflineDatabase();
