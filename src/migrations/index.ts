import * as migration_20260908_060538_initial from './20260908_060538_initial';

export const migrations = [
  {
    up: migration_20260908_060538_initial.up,
    down: migration_20260908_060538_initial.down,
    name: '20260908_060538_initial'
  },
];
