export type Nation = {
  id: string;
  name: string;
  description?: string;
  region: string;
  isArchived: boolean;
  startYear: number;
  startPopulation: number;
  createdAt: Date;
  updatedAt: Date;
  growths?: Growth[];
  vassalIds: string;
  overlordId?: string;
};

export type Era = {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  startDate: Date;
  endDate: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  growths?: Growth[];
};

export type Growth = {
  id: string;
  startPopulation: number;
  growthRate: number;
  endPopulation: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  nationId: string;
  eraId: string;
  nation?: Nation;
  era?: Era;
};

export type PopulationRecord = {
  id: string;
  nationId: string;
  eraId: string;
  population: number;
  growthRate: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NationWithPopulation = Nation & {
  currentPopulation?: number;
  currentGrowthRate?: number;
};

export type Vassal = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  overlordId: string;
  vassalId: string;
  overlord?: Nation;
  vassal?: Nation;
}; 