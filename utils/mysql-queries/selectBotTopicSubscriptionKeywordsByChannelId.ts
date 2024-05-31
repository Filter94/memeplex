import {
  botKeywords,
  botTopicNames,
  botTopicSubscriptions,
  botTopics,
} from '../../db/schema'
import { eq } from 'drizzle-orm'
import type { TDbConnection } from '../types'

export const selectBotTopicSubscriptionKeywordsByChannelId = (
  db: TDbConnection,
  channelId: number,
) => {
  return db
    .selectDistinct({
      topic: botTopicNames.name,
      topicId: botTopics.nameId,
      keywordId: botTopics.keywordId,
      keyword: botKeywords.keyword,
    })
    .from(botTopicSubscriptions)
    .leftJoin(botTopics, eq(botTopics.nameId, botTopicSubscriptions.topicId))
    .leftJoin(botTopicNames, eq(botTopicNames.id, botTopics.nameId))
    .leftJoin(botKeywords, eq(botKeywords.id, botTopics.keywordId))
    .where(eq(botTopicSubscriptions.channelId, channelId))
    .orderBy(botTopicNames.name, botKeywords.keyword)
}
