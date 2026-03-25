import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';

type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage['increment']>
>;
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  constructor(private readonly redisService: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const ttlSeconds = Math.ceil(ttl / 1000);
    const hitKey = `throttle:${throttlerName}:${key}`;

    const hits = await this.redisService.incr(hitKey);
    if (hits === 1) {
      await this.redisService.expire(hitKey, ttlSeconds);
    }

    const timeToExpire = await this.redisService.ttl(hitKey);

    let isBlocked = false;
    let timeToBlockExpire = 0;

    if (hits > limit && blockDuration > 0) {
      const blockKey = `${hitKey}:blocked`;
      const blockTtlSeconds = Math.ceil(blockDuration / 1000);
      const alreadyBlocked = await this.redisService.exists(blockKey);
      if (!alreadyBlocked) {
        await this.redisService.setex(blockKey, blockTtlSeconds, '1');
      }
      isBlocked = true;
      timeToBlockExpire = await this.redisService.ttl(blockKey);
    }

    return {
      totalHits: hits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }
}
