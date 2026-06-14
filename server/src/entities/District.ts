import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Mandal } from "./Mandal";

@Entity("districts")
export class District {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 100, default: "Andhra Pradesh" })
  state!: string;

  @OneToMany(() => Mandal, (mandal) => mandal.district)
  mandals!: Mandal[];
}
