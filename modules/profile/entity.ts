import { type IProfileEntity } from './types';
import { Entity } from 'typeorm';
import { User } from '../user/entity';

@Entity('wishes')
export class Profile extends User implements IProfileEntity {}
