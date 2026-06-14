import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Complaint } from "./Complaint";
import { User } from "./User";

@Entity("assignments")
export class Assignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Complaint, { onDelete: "CASCADE" })
  @JoinColumn({ name: "complaint_id" })
  complaint!: Complaint;

  @ManyToOne(() => User)
  @JoinColumn({ name: "assigned_by" })
  assigned_by!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "assigned_to" })
  assigned_to!: User;

  @Column({ type: "text", nullable: true })
  notes!: string;

  @CreateDateColumn()
  assigned_at!: Date;
}
