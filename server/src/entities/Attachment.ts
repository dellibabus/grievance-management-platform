import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Complaint } from "./Complaint";
import { User } from "./User";

@Entity("attachments")
export class Attachment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Complaint, { onDelete: "CASCADE" })
  @JoinColumn({ name: "complaint_id" })
  complaint!: Complaint;

  @Column({ type: "varchar", length: 500 })
  file_url!: string;

  @Column({ type: "varchar", length: 255 })
  file_name!: string;

  @Column({
    type: "varchar",
    length: 20
  })
  file_type!: "image" | "pdf" | "video";

  @Column({ type: "integer" })
  file_size!: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "uploaded_by" })
  uploaded_by!: User | null;

  @CreateDateColumn()
  created_at!: Date;
}
