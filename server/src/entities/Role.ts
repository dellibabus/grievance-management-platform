import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 50,
    unique: true
  })
  name!: "super_admin" | "state_admin" | "district_admin" | "volunteer";

  @Column({ type: "jsonb", default: [] })
  permissions!: string[];

  @CreateDateColumn()
  created_at!: Date;
}
