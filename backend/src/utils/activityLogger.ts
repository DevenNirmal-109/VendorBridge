import prisma from '../lib/prisma';

interface LogActivityParams {
  userId?: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  description: string;
}

export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        eventType: params.eventType,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
      },
    });
  } catch (err) {
    // Never crash the main request due to logging failure
    console.error('Failed to write activity log:', err);
  }
};
