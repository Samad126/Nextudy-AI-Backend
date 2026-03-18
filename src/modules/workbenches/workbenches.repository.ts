import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import {
  anyMemberFilter,
  ownerOrEditorFilter,
} from '../../common/utils/workspace-filters.js';

@Injectable()
export class WorkbenchesRepository {
  constructor(private readonly db: DatabaseService) {}

  findWorkspaceAsMember(workspaceId: number, userId: number) {
    return this.db.workspace.findFirst({
      where: { id: workspaceId, ...anyMemberFilter(userId) },
    });
  }

  findWorkspaceAsEditor(workspaceId: number, userId: number) {
    return this.db.workspace.findFirst({
      where: { id: workspaceId, ...ownerOrEditorFilter(userId) },
    });
  }

  findOneAsMember(workbenchId: number, userId: number) {
    return this.db.workbench.findFirst({
      where: { id: workbenchId, workspace: { ...anyMemberFilter(userId) } },
    });
  }

  findOneAsEditor(workbenchId: number, userId: number) {
    return this.db.workbench.findFirst({
      where: { id: workbenchId, workspace: { ...ownerOrEditorFilter(userId) } },
    });
  }

  findAll(workspaceId: number) {
    return this.db.workbench.findMany({ where: { workspaceId } });
  }

  create(workspaceId: number, name: string) {
    return this.db.workbench.create({ data: { workspaceId, name } });
  }

  update(workbenchId: number, name: string | undefined) {
    return this.db.workbench.update({ where: { id: workbenchId }, data: { name } });
  }

  delete(workbenchId: number) {
    return this.db.workbench.delete({ where: { id: workbenchId } });
  }

  findResources(workbenchId: number) {
    return this.db.workbenchResource.findMany({
      where: { workbenchId },
      include: { resource: true },
    });
  }

  setResources(workbenchId: number, resourceIds: number[]) {
    return this.db.$transaction([
      this.db.workbenchResource.deleteMany({ where: { workbenchId } }),
      this.db.workbenchResource.createMany({
        data: resourceIds.map((resourceId) => ({ workbenchId, resourceId })),
      }),
    ]);
  }
}
