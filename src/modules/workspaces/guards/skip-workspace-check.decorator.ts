import { SetMetadata } from '@nestjs/common';

export const SKIP_WORKSPACE_CHECK_KEY = 'skipWorkspaceCheck';

export const SkipWorkspaceCheck = () =>
  SetMetadata(SKIP_WORKSPACE_CHECK_KEY, true);
