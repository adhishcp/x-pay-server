import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { user } from '@prisma/client';

export const GetUser = createParamDecorator(
  (data: keyof user | undefined, ctx: ExecutionContext): user | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
