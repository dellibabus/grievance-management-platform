import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Complaint } from "./Complaint";
import { User } from "./User";

@Entity("complaint_updates")
export class ComplaintUpdate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Complaint, { onDelete: "CASCADE" })
  @JoinColumn({ name: "complaint_id" })
  complaint!: Complaint;

  @ManyToOne(() => User)
  @JoinColumn({ name: "updated_by" })
  updated_by!: User;

  @Column({ type: "varchar", length: 50 })
  status!: string;

  @Column({ type: "text" })
  comment!: string;

  @CreateDateColumn()
  created_at!: Date;
}
