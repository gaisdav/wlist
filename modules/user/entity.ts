import { Entity, Column, PrimaryGeneratedColumn, BaseEntity, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { type IUserEntity } from './types';

@Entity('users')
export class User extends BaseEntity implements IUserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: null })
  googleId: string;

  @Column({ default: null })
  avatarSrc: string;

  @Column({ default: null })
  bio: string;

  @Column({ default: null })
  birthdate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
