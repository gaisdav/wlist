import { type IWishEntity } from './types';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ArchivedBaseEntity } from '../../common/ArchivedBaseEntity';
import { User } from '../user/entity';

@Entity('wishes')
export class Wish extends ArchivedBaseEntity implements IWishEntity {
  @Column()
  title: string;

  @Column({ nullable: true, default: null })
  description: string;

  @Column({ nullable: true, default: null })
  imageSrc: string;

  @ManyToOne(() => User)
  @JoinColumn()
  author: User;
}
