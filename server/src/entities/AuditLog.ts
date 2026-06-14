import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user!: User | null;

  @Column({ type: "varchar", length: 100 })
  action!: string;

  @Column({ type: "varchar", length: 100 })
  entity!: string;

  @Column({ type: "uuid", nullable: true })
  entity_id!: string | null;

  @Column({ type: "jsonb", nullable: true })
  meta!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip_address!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
