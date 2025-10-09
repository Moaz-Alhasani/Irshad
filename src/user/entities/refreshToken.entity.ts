import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  token: string;

  @Column()
  userId: number;

  @Column()
  fingerprint: string;

  @Column()
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;
}
