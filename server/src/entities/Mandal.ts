import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { District } from "./District";
import { Village } from "./Village";

@Entity("mandals")
export class Mandal {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @ManyToOne(() => District, (district) => district.mandals, { onDelete: "CASCADE" })
  @JoinColumn({ name: "district_id" })
  district!: District;

  @OneToMany(() => Village, (village) => village.mandal)
  villages!: Village[];
}
