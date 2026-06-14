import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, BeforeInsert } from "typeorm";
import { Category } from "./Category";
import { District } from "./District";
import { Mandal } from "./Mandal";
import { Village } from "./Village";
import { User } from "./User";

@Entity("complaints")
export class Complaint {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 30, unique: true })
  ticket_number!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({
    type: "varchar",
    length: 20,
    default: "pending"
  })
  status!: "pending" | "assigned" | "in_progress" | "resolved" | "closed" | "rejected";

  @Column({
    type: "varchar",
    length: 20,
    default: "medium"
  })
  priority!: "low" | "medium" | "high" | "critical";

  @ManyToOne(() => Category, { eager: true })
  @JoinColumn({ name: "category_id" })
  category!: Category;

  @Column({ type: "varchar", length: 150 })
  citizen_name!: string;

  @Column({ type: "varchar", length: 20 })
  citizen_phone!: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  citizen_email!: string | null;

  @ManyToOne(() => District, { eager: true })
  @JoinColumn({ name: "district_id" })
  district!: District;

  @ManyToOne(() => Mandal, { eager: true })
  @JoinColumn({ name: "mandal_id" })
  mandal!: Mandal;

  @ManyToOne(() => Village, { nullable: true, eager: true })
  @JoinColumn({ name: "village_id" })
  village!: Village | null;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: "assigned_to" })
  assigned_to!: User | null;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: "created_by" })
  created_by!: User | null;

  @Column({ type: "timestamp", nullable: true })
  resolved_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @BeforeInsert()
  generateTicketNumber() {
    if (!this.ticket_number) {
      const year = new Date().getFullYear();
      const rand = Math.floor(10000 + Math.random() * 90000); // 5 digits
      this.ticket_number = `GRV-${year}-${rand}`;
    }
  }
}
