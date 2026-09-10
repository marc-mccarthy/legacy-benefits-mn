import * as migration_20260908_060538_initial from './20260908_060538_initial';
import * as migration_20260908_143531_business_identity from './20260908_143531_business_identity';
import * as migration_20260909_035517_drop_hero_video from './20260909_035517_drop_hero_video';

export const migrations = [
  {
    up: migration_20260908_060538_initial.up,
    down: migration_20260908_060538_initial.down,
    name: '20260908_060538_initial',
  },
  {
    up: migration_20260908_143531_business_identity.up,
    down: migration_20260908_143531_business_identity.down,
    name: '20260908_143531_business_identity',
  },
  {
    up: migration_20260909_035517_drop_hero_video.up,
    down: migration_20260909_035517_drop_hero_video.down,
    name: '20260909_035517_drop_hero_video'
  },
];
