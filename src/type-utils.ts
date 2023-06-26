export type EBB = "ebb";
export type GCode = "gcode";
export type SBP = "sbp";
export type ISA = EBB | GCode | SBP;
export type Instruction = string;

export interface Toolpath {
    isa: ISA;
    instructions: Instruction[];
}

export type Operation = "move";
export interface IR {
    op: Operation;
    args: {
        x: number | null;
        y: number | null;
        z: number | null;
        f: number | null;
    }, 
    state: {
        units: string | null;
        toolOnBed: boolean
    }
};

