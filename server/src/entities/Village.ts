import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Mandal } from "./Mandal";

@Entity("villages")
export class Village {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @ManyToOne(() => Mandal, (mandal) => mandal.villages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "mandal_id" })
  mandal!: Mandal;
}
