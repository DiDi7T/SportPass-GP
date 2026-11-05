import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const users = { createQueryBuilder: jest.fn() };
  const athletes = { findOne: jest.fn() };
  const sessions = { create: jest.fn(), save: jest.fn() };
  const jwt = { signAsync: jest.fn() };
  const config = { get: jest.fn((_key: string, fallback: string) => fallback) };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(users as any, athletes as any, sessions as any, jwt as any, config as any);
  });

  it('rejects login emails outside the university domain', async () => {
    await expect(service.login('student@example.com', 'password', {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.createQueryBuilder).not.toHaveBeenCalled();
  });
});
