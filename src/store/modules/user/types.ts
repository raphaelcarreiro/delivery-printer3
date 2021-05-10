import { User } from '@src/types/user';

export const SET_USER = '@user/SET_USER';

interface SetUserAction {
  type: typeof SET_USER;
  user: User;
}

export type UserActions = SetUserAction;
