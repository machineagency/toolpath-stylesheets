export type EBB = "ebb";
export type GCode = "gcode";
export type SBP = "sbp";
export type ISA = EBB | GCode | SBP;
export type Instruction = string;

export interface Toolpath {
    isa: ISA;
    instructions: Instruction[];
}

export interface IR {
    isa: ISA;
    original: Instruction;
}

