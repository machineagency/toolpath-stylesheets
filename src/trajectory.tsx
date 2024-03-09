import React, { useState } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import ReactDOM from 'react-dom';
import {useEffect, useRef} from "react";
import { norm, number, dot } from "mathjs";
import { IR } from './type-utils';
import { lowerEBB, lowerGCode, lowerSBP } from './ir';
import { toolpath, Toolpath } from './type-utils';
import { exampleToolpaths } from './example-toolpaths';

import * as Plot from "@observablehq/plot";

import './trajectory.css'

const DEBUG: boolean = false;

type AllSegments = "all_segments";

interface TrajectoryWindowProps {
    toolpath: Toolpath | null;
    lineSegments: LineSegment[];
    filterSegmentIds: Set<number> | AllSegments;
    min: number;
    max: number;
}

interface DashboardSettingsProps {
    onSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface RangeSliderProps {
    absoluteMax: number;
    onChange: (newRange: number[] | number) => void;
}


interface PlotProps {
    lineSegments: LineSegment[];
    filterSegmentIds: Set<number> | AllSegments;
    min: number;
    max: number;
}

const TOOLPATH_TABLE: Record<string, Toolpath> = {
    testToolpath: toolpath("sbp", ["M2, 0, 0", "M2, 10, 10"]),
    rectangle: toolpath("sbp", ["M2, 0, 0", "M2, 10, 0", "M2, 10, 5", "M2, 0, 5", "M2, 0, 0"]),
    triangle: toolpath("sbp", ["M2, 0, 0", "M2, 10, 0", "M2, 5, 5", "M2, 0, 0"]),
    star: toolpath("sbp", ["M2, 50, 0", "M2, 65, 35", "M2, 100, 35", "M2, 75, 60",
                    "M2, 90, 95", "M2, 50, 75", "M2, 10, 95", "M2, 25, 60", "M2, 0, 35",
                    "M2, 35, 35", "M2, 50, 0"]),
    wave: exampleToolpaths.gCodeWave,
    box: exampleToolpaths.ebbBox,
    signature: exampleToolpaths.ebbSignature,
    gears: exampleToolpaths.gears,
    propellerTopScallop: exampleToolpaths.propellerTopScallop
};

function DashboardSettings({ onSelect }: DashboardSettingsProps) {
    const toolpathsOptionElements = Object.keys(TOOLPATH_TABLE).map(tpName => {
        return <option value={tpName} key={tpName}>{tpName}</option>
    });
    return (
        <div className="dashboard-settings">
            <select onChange={onSelect} name="toolpath-select" id="toolpath-select">
                {toolpathsOptionElements}
            </select>
        </div>
    );
}

function RangeSlider({ absoluteMax, onChange }: RangeSliderProps) {
    const [range, setRange] = useState<number[]>([0, absoluteMax]);

    const handleRangeChange = (newRange: number | number[]) => {
        setRange(newRange as number[]);
        onChange(newRange);
    };

    useEffect(() => {
        setRange([0, absoluteMax]);
    }, [absoluteMax]);

    return (
        <div className="range-slider">
            <Slider
              range
              min={0}
              max={absoluteMax}
              value={range}
              onChange={handleRangeChange}
            />
            <div className="range-label">
                Range: {range[0]} - {range[1]}
            </div>

        </div>
    )
}

interface Vec3WithId {
    x: number;
    y: number;
    z: number;
    id: number;
}

function SegmentPlot({ lineSegments, filterSegmentIds, min, max }: PlotProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const findXYExtrema = (lineSegments: LineSegment[]): [number, number] => {
        let points = lineSegments.flatMap(ls => [ls.start, ls.end]);
        let components = points.flatMap(pt => [pt.x, pt.y]);
        return [Math.min(...components), Math.max(...components)];
    }

    useEffect(() => {
        if (lineSegments === undefined) return;
        let extrema = findXYExtrema(lineSegments);
        const xyPlot = Plot.plot({
          grid: true,
          x: {
            domain: extrema
          },
          y: {
            domain: extrema
          },
          marks: [
            Plot.line(lineSegments.flatMap((segment) => {
                let startPlusId = {...segment.start, id: segment.parent};
                let endPlusId = {...segment.end, id: segment.parent};
                return [startPlusId, endPlusId, null]
            }), {
                filter: (point: Vec3WithId | null) => {
                    if (point === null || filterSegmentIds === 'all_segments') {
                        return true;
                    } else {
                        return filterSegmentIds.has(point.id);
                    }
                },
                x: (d: Vec3 | null) => {
                    if (d === null) {
                        return null;
                    }
                    return d.x;
                },
                y: (d: Vec3 | null) => {
                    if (d === null) {
                        return null;
                    }
                    return d.y;
                },
            })
          ]
        });
        if (containerRef.current) {
            containerRef.current.append(xyPlot);
        }
        return () => {
            xyPlot.remove();
        };
      }, [lineSegments, filterSegmentIds, min, max]);

    return <div className="flex" ref={containerRef}/>;
}

function ProfilePlot({ lineSegments, filterSegmentIds, min, max }: PlotProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (lineSegments === undefined) return;
        let cumulativeTimes: (number | null)[] = [];
        let soFar = 0;
        lineSegments.forEach((ls: LineSegment) => {
            let newTime = soFar + ls.profile.t;
            cumulativeTimes.push(soFar);
            cumulativeTimes.push(newTime);
            cumulativeTimes.push(null);
            soFar = newTime;
        });

        cumulativeTimes = cumulativeTimes.slice(min * 3, max * 3);
        const vPairs = lineSegments.flatMap((ls: LineSegment) => {
            let v0Pair = [ls.profile.v0, ls.parent];
            let vPair = [ls.profile.v, ls.parent];
            return [v0Pair, vPair, null];
        });
        const aPairs = lineSegments.flatMap((ls: LineSegment) => {
            let aPair = [ls.profile.a, ls.parent];
            return [aPair, aPair, null];
        });

        const plot = Plot.plot({
            x: {
                grid: true,
                label: "time (s)",
            },
            y: {
              grid: true,
              label: "mm / s ( / s)"
            },
            marks: [
              Plot.line(cumulativeTimes, {
                filter: (_, i: number) => {
                    if (filterSegmentIds === 'all_segments' || vPairs[i] === null) {
                        return true;
                    }
                    return filterSegmentIds.has(vPairs[i]![1]);
                },
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => vPairs[i]?.[0],
                stroke: "#4e79a7"
              }),
              Plot.text(cumulativeTimes, Plot.selectLast({
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => vPairs[i],
                text: (_) => "Velocity",
                lineAnchor: "top",
                dy: -5
              })),
              Plot.line(cumulativeTimes, {
                filter: (_, i: number) => {
                    if (filterSegmentIds === 'all_segments' || aPairs[i] === null) {
                        return true;
                    }
                    return filterSegmentIds.has(aPairs[i]![1]);
                },
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => aPairs[i]?.[0],
                stroke: "#e15759"
              }),
              Plot.text(cumulativeTimes, Plot.selectLast({
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => aPairs[i],
                text: (_) => "Acceleration",
                lineAnchor: "top",
                dy: -5
              }))
            ]
          })
        if (containerRef.current) {
            containerRef.current.append(plot);
        }
        return () => plot.remove();
      }, [lineSegments, filterSegmentIds, min, max]);

    return <div ref={containerRef}/>;
}

interface DepthHistogramProps {
    lineSegments: LineSegment[];
    onBinSelect: (setIds: Set<number> | AllSegments) => void;
}

function DepthHistogram({ lineSegments, onBinSelect }: DepthHistogramProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        // TODO: only considering the start point of segments for now
        const histogramBrush = Plot.brushX(Plot.binX({ y: 'count' }, {
            x: (ls: LineSegment) => ls.start.z
        }));
        const plot = Plot.plot({
            y: {grid: true},
            marks: [
                Plot.rectY(lineSegments, Plot.binX({ y: 'count' }, {
                    x: (ls: LineSegment) => ls.start.z,
                    // @ts-ignore
                    fillOpacity: 0.5
                })),
                Plot.rectY(lineSegments, histogramBrush),
                Plot.ruleY([0])
            ]
          });
          const zPlot = Plot.plot({
            grid: true,
            marks: [
              Plot.dot(lineSegments.flatMap((segment) => {
                  let startPlusId = {...segment.start, id: segment.parent};
                  let endPlusId = {...segment.end, id: segment.parent};
                  return [startPlusId, endPlusId, null]
              }), Plot.brush({
                  x: (_, index: number) => {
                      return index / 3;
                  },
                  y: (d: Vec3 | null) => {
                      if (d === null) {
                        return null;
                      }
                      return d.z;
                  },
                  r: 0.5
              }))
            ]
          });
          zPlot.addEventListener("input", (_) => {
            // console.log(zPlot.value.flat());
            if (zPlot.value === null) {
                onBinSelect('all_segments');
                return;
            }
            let selectedSegments = zPlot.value.flat() as (LineSegment | null)[];
            let segIds = selectedSegments
                .filter(maybeSeg => maybeSeg !== null)
                .map(ls => {
                    if (ls === null) {
                        return null
                    } else {
                        return ls.id;
                    }
                }) as number[];
            let idSet = new Set(segIds);
            onBinSelect(idSet);
          });
        if (containerRef.current) {
            containerRef.current.append(plot);
            containerRef.current.append(zPlot);
        }
        return () => {
            plot.remove();
            zPlot.remove();
        };
    }, [lineSegments]);
    return (
        <div className="depth-histogram-container">
            <div className="plot-title">Depth Histogram</div>
            <div className="depth-histogram" ref={containerRef}></div>
        </div>
    );
}

interface Vec3 {
    x: number,
    y: number,
    z: number
}

interface Segment {
    moveId: number,
    startVelocity: number,
    endVelocity: number,
    coords: Vec3 
}

interface LineSegment {
    parent: number,
    start: Vec3,
    end: Vec3,
    unit: Vec3,
    profile: FirstOrder,
    aMax: number
}

interface KinematicLimits {
    vMax: Vec3,
    aMax: Vec3,
    junctionSpeed: number,
    junctionDeviation: number
}

interface FirstOrder {
    v0: number,
    v: number,
    a: number,
    t: number,
    x: number
}

interface TrajectoryPasses {
    locations: Segment[],
    prePlanned: LineSegment[],
    halfPlanned: LineSegment[],
    fullyPlanned: LineSegment[]
}

function Vec3(x: number, y: number, z: number): Vec3 {
    return {
        x: x,
        y: y,
        z: z
    }
}
function segment(moveId: number, startVelocity: number, endVelocity: number, 
        coords: Vec3): Segment {
    return {
        moveId: moveId,
        startVelocity: startVelocity,
        endVelocity: endVelocity,
        coords: coords
    }
}

function lineSegment(parent: number, start: Vec3, end: Vec3, unit: Vec3, 
                     profile: FirstOrder, amax: number): LineSegment {
    return {
        parent: parent,
        start: start,
        end: end,
        unit: unit,
        profile: profile,
        aMax: amax
    }
}

function kinematicLimits(maxVelocity: Vec3, maxAcceleration: Vec3,
         junctionSpeed: number, junctionDeviation: number): KinematicLimits {
    return {
        vMax: maxVelocity,
        aMax: maxAcceleration,
        junctionSpeed: junctionSpeed,
        junctionDeviation: junctionDeviation
    }
}

function firstOrder(initialVelocity: number, finalVelocity: number, acceleration: number,
         timeDuration: number, length: number): FirstOrder {
    return {
        v0: initialVelocity,
        v: finalVelocity,
        a: acceleration,
        t: timeDuration,
        x: length
    }
}

function planTriplets(locations: Segment[], prePlanned: LineSegment[],
    halfPlanned: LineSegment[], fullyPlanned: LineSegment[]): TrajectoryPasses {
    return {
        locations: locations,
        prePlanned: prePlanned,
        halfPlanned: halfPlanned,
        fullyPlanned: fullyPlanned
    }
}

function fromGeo(parent: number, v0: number, v1: number, start: Vec3, end: Vec3,
    k1: KinematicLimits): LineSegment {
    let startVel = Math.abs(v0);
    let endVel = Math.abs(v1);
    let delta = Vec3(end.x - start.x, end.y - start.y, end.z - start.z)

    let length = Math.sqrt((end.x - start.x)**2 + (end.y - start.y)**2);
    let profile = normalize(startVel, endVel, null, null, length) as FirstOrder;
    let unit = Vec3(delta.x / length, delta.y / length, delta.z / length);
    return lineSegment(parent, start, end, unit, profile, limitVector(unit, k1.aMax));

}

function limitVector(unitVec: Vec3, limits: Vec3): number {
    let absUnitVec = Vec3(Math.abs(unitVec.x) / limits.x,
                          Math.abs(unitVec.y) / limits.y,
                          Math.abs(unitVec.z) / limits.z);
    // TODO: determine if we need to treat Z differently, we don't want 2D moves
    // to behave differently.
    let max = Math.max(absUnitVec.x, absUnitVec.y, absUnitVec.z);
    return 1 / max;
}

function normalize(v0: number | null, v: number | null, a: number | null,
                    t: number | null, x: number | null): FirstOrder | null {
    let arr = [v0, v, a, t, x];
    if ((arr.length - arr.filter(element => element !== null && !isNaN(element)).length) != 2) {
        return null;
    }

    if (v0 === null) {
        if (v === null) {
            let startVel = x! / t! - a! * t! / 2;
            return firstOrder(startVel, startVel + a! * t!, a!, t!, x!);
        } else if (a === null) {
            let startVel = 2 * x! / t! - v;
            return firstOrder(startVel, v, (v - startVel) / t!, t!, x!);
        } else if (t === null) {
            let startVel = Math.sqrt(v**2 - 2 * a * x!);
            return firstOrder(startVel, v, a, (v - startVel) / a, x!);
        } else if (x === null) {
            let startVel = v - a * t;
            return firstOrder(startVel, v, a, t, t * (startVel + v) / 2);
        }
    }
    if (v === null) {
        if (a === null) {
            let endVel = 2 * x! / t! - v0!;
            return firstOrder(v0!, endVel, (endVel - v0!) / t!, t!, x!);
        } else if (t === null) {
            let endVel = Math.sqrt(v0!**2 + 2 * a * x!);
            return firstOrder(v0!, endVel, a, (endVel - v0!) / a, x!);
        } else {
            let endVel = v0! + a * t;
            return firstOrder(v0!, endVel, a, t, t * (v0! + endVel) / 2);
        }
    }
    if (a === null) {
        if (t === null) {
            let time = 2 * x! / (v0! + v);
            return firstOrder(v0!, v, (v - v0!) / time, time, x!);
        } else if (x === null) {
            let acc = (v - v0!) / t;
            return firstOrder(v0!, v, acc, t, t * (v0! + v) / 2);
        }
    }
    let time = (v - v0!) / a!;
    return firstOrder(v0!, v, a!, time, time * (v0! + v) / 2);
}

function computeLineSegments(tp: Toolpath): TrajectoryPasses {
    let irs;
    // handles lowering
    if (tp.isa == "ebb") {
        irs = lowerEBB(tp);
    } else if (tp.isa == "sbp") {
        irs = lowerSBP(tp);
    } else {
        irs = lowerGCode(tp);
    }
    let segments: Segment[] = [];
    let isNullMoveCommand = (ir: IR) => {
        return ir.op === "move" && (ir.args.x === null || ir.args.y === null);
    }
    let limits = kinematicLimits(Vec3(300.0, 300.0, 150.0),
                                 Vec3(50.0, 50.0, 25.0), 1e-3, 1e-2); // can change later
    let vMaxEitherAxis = Math.max(limits.vMax.x, limits.vMax.y);
    irs.forEach(function (ir: IR, index: number) {
        if (isNullMoveCommand(ir)) {
            return;
        }
        let seg = segment(index, vMaxEitherAxis, vMaxEitherAxis,
                            Vec3(ir.args.x!, ir.args.y!, ir.args.z!));
        segments.push(seg);
    });
    let startLocation = { x: 0, y: 0, z: 0};
    let plannerSegments: LineSegment[] = [];

    segments.forEach(function (s: Segment) {
        let endLocation = s.coords;
        let segmentNorm = number(norm([startLocation.x - endLocation.x, startLocation.y - endLocation.y]));

        if (segmentNorm >= 1e-18) {
            let segment = fromGeo(s.moveId, s.startVelocity, s.endVelocity, startLocation, endLocation, limits);
            plannerSegments.push(segment);
            startLocation = endLocation;
        }
    });

    let halfPlanned = [... forwardPass(plannerSegments, 0, limits)];

    let plannedSegments = [...planSegments(plannerSegments, limits)];

    return planTriplets(segments, plannerSegments, halfPlanned, plannedSegments);
}

function* planSegments(segs: LineSegment[], k1: KinematicLimits, v0: number = 0.0) {
    for (let chunk of backwardPass([...forwardPass(segs, v0, k1)])) {
        yield* chunk;
    }
}

function backwardPass(segments: LineSegment[], v: number = 0) {
    let out = [];
    let runningV = v;
    for (let i = segments.length - 1; i >= 0; i--) {
        out[i] = [...planSegment(segments[i], runningV, true)];
        runningV = out[i][0].profile.v0;
    }
    return out;
}

function* forwardPass(segments: LineSegment[], v0: number, limits: KinematicLimits) {
    let res: LineSegment[] = [];
    if (segments.length == 0) {
        return res;
    }
    let prev: LineSegment | null = null;
    let velocityInit = v0;
    for (let s of segments) {
        let p = s.profile;
        let v = limitVector(s.unit, limits.vMax);

        if (prev != null) {
            let jv = computeJunctionVelocity(prev, s, limits);
            if (jv != null) {
                velocityInit = Math.min(velocityInit, jv);
            }
        }

        let changed = false;
        if (p.v0 > v || p.v > v) {
            p = normalize(Math.min(p.v0, v), Math.min(p.v, v), null, null, p.x) as FirstOrder;
            changed = true;
        }
        if (Math.abs(p.a) > s.aMax) {
            p = normalize(p.v0, null, s.aMax * p.a / Math.abs(p.a), null, p.x) as FirstOrder;
            changed = true;
        }
        let seg = s;
        if (changed) {
            seg = lineSegment(s.parent, s.start, s.end, s.unit, p, s.aMax);
        }

        for (let sub of planSegment(seg, velocityInit)) {
            velocityInit = sub.profile.v;
            yield sub;
        }

        prev = seg;
    }
}

function* planSegment(s: LineSegment, v: number, reverse: boolean = false) {
    let a = s.aMax;
    let p;
    if (reverse) {
        p = reverseFirstOrder(s.profile);
    } else {
        p = s.profile;
    }

    if (p.v0 <= v) {
        yield s;
        return;
    }

    let da = a - p.a;
    let dv = p.v0 - v;

    if (da <= 0 || p.t * da <= dv) {
        if (reverse) {
            p = normalize(null, v, -1 * a, null, p.x);
        } else {
            p = normalize(v, null, a, null, s.profile.x);
        }
        yield lineSegment(s.parent, s.start, s.end, s.unit, p!, s.aMax);
        return;
    }

    let firstProfile = normalize(v, null, a, dv / da, null) as FirstOrder;
    let secondProfile = normalize(firstProfile.v, p.v, null, null,  p.x - firstProfile.x) as FirstOrder;

    if (reverse) {
        // potential area for error
        let firstProfileOg = firstProfile;
        firstProfile = reverseFirstOrder(secondProfile);
        secondProfile = reverseFirstOrder(firstProfileOg);
    }

    let crossing = Vec3(s.start.x + s.unit.x * firstProfile.x,
                          s.start.y + s.unit.y * firstProfile.x,
                          s.start.z + s.unit.z * firstProfile.x);

    yield lineSegment(s.parent, s.start, crossing, s.unit, firstProfile, s.aMax);
    yield lineSegment(s.parent, crossing, s.end, s.unit, secondProfile, s.aMax);
}

function reverseFirstOrder(profile: FirstOrder): FirstOrder {
    return firstOrder(profile.v, profile.v0, 0 - profile.a, profile.t, profile.x);
}

function computeJunctionVelocity(p: LineSegment, s: LineSegment, limits: KinematicLimits): number | null {
    let junctionCos = -1 * dot([s.unit.x, s.unit.y], [p.unit.x, p.unit.y]);

    if (junctionCos > 0.9999) {
        return limits.junctionSpeed;
    } else if (junctionCos < -0.9999) {
        return null;
    } else {
        let junctionVect = Vec3(s.unit.x - p.unit.x, s.unit.y - p.unit.y, s.unit.z - p.unit.z);
        let vectDotSelf = dot([junctionVect.x, junctionVect.y, junctionVect.z],
                              [junctionVect.x, junctionVect.y, junctionVect.z]);
        junctionVect.x /= Math.sqrt(vectDotSelf);
        junctionVect.y /= Math.sqrt(vectDotSelf);
        junctionVect.z /= Math.sqrt(vectDotSelf);

        let junctionAcceleration = limitValueByAxis(limits.aMax, junctionVect);
        let sinThetaD2 = Math.sqrt(0.5 * (1 - junctionCos));
        let junctionVelocity = (junctionAcceleration * limits.junctionDeviation * sinThetaD2) / (1 - sinThetaD2);
        return Math.max(limits.junctionSpeed, junctionVelocity);
    }
}

function limitValueByAxis(limits: Vec3, vector: Vec3): number {
    let limitValue = 1e19;
    if (vector.x != 0) {
        limitValue = Math.min(limitValue, Math.abs(limits.x / vector.x));
    }
    if (vector.y != 0) {
        limitValue = Math.min(limitValue, Math.abs(limits.y / vector.y));
    }
    if (vector.z != 0) {
        limitValue = Math.min(limitValue, Math.abs(limits.z / vector.z));
    }
    return limitValue;
}

/*
function linspace(start: number, stop: number, cardinality: number): number[] {
    let arr: number[] = [];
    let step = (stop - start) / (cardinality - 1);
    for (let i = 0; i < cardinality; i++) {
        arr.push(start + (step * i));
    }

    return arr;
}
*/

function TrajectoryWindow({ toolpath, min, max, lineSegments, filterSegmentIds }: TrajectoryWindowProps) {
    // TODO: do all the planning using the toolpath parameter passed in the props
    // let { locations, prePlanned, halfPlanned, fullyPlanned} = makeTestSegment(20);
    if (!toolpath) {
        // If no toolpath is selected, render empty divs for the graphs
        return (
            <div>
                <div className="plot-title">Locations to be visited</div>
                <div className="empty-plot">No toolpath selected</div>

                {DEBUG && (
                    <React.Fragment>
                    <div className="plot-title">Pre-planned Segments</div>
                    <div className="empty-plot">No toolpath selected</div>
                    <div className="plot-title">Half-planned Segments</div>
                    <div className="empty-plot">No toolpath selected</div>
                    </React.Fragment>
                )}
                <div className="plot-title">Fully-planned Segments</div>
                <div className="empty-plot">No toolpath selected</div>
            </div>
        );
    }

    return (<div>
        <div className="plot-title">Locations to be visited</div>
        <SegmentPlot lineSegments={lineSegments} filterSegmentIds={filterSegmentIds}
                     min={min} max={max}></SegmentPlot>

        {/* {DEBUG && (
            <React.Fragment>
            <div className="plot-title">Pre-planned Segments</div>
            <ProfilePlot lineSegments={prePlanned} min={min} max={max}></ProfilePlot>
            <div className="plot-title">Half-planned Segments</div>
            <ProfilePlot lineSegments={halfPlanned} min={min} max={max}></ProfilePlot>
            </React.Fragment>
        )} */}
        <div className="plot-title">Fully-planned Segments</div>
        <ProfilePlot lineSegments={lineSegments} filterSegmentIds={filterSegmentIds}
                    min={min} max={max}></ProfilePlot>
    </div>)
};

function App() {
    const defaultToolpath = TOOLPATH_TABLE["propellerTopScallop"];
    const [currentToolpath, setCurrentToolpath] = useState<Toolpath | null>(defaultToolpath);
    const [lineSegments, setLineSegments] = useState<LineSegment[]>([]);
    const [filterSegmentIds, setFilterSegmentIds] = useState<Set<number> | AllSegments>("all_segments");
    const selectToolpath = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const toolpathName = event.target.value;
        const toolpath = TOOLPATH_TABLE[toolpathName];
        setCurrentToolpath(toolpath);
    };

    useEffect(() => {
        if (currentToolpath !== null) {
            let { fullyPlanned } = computeLineSegments(currentToolpath);
            setLineSegments(fullyPlanned);
            setMinValue(0);
            setMaxValue(fullyPlanned.length);
        }
    }, [currentToolpath]);

    // slider min and max values
    const [minValue, setMinValue] = useState<number>(0);
    const [maxValue, setMaxValue] = useState<number>(lineSegments.length);

    const handleRangeChange = (newRange: number[] | number) => {
        let range = newRange as number[];
        setMinValue(range[0]);
        setMaxValue(range[1]);
    }

    const handleBinSelect = (selectIds: Set<number> | AllSegments) => {
        if (selectIds === null) {
            setFilterSegmentIds('all_segments');
        }
        else {
            setFilterSegmentIds(selectIds);
        }
    }

    return (
        <div>
            <DashboardSettings onSelect={selectToolpath}></DashboardSettings>
            <RangeSlider absoluteMax={lineSegments.length} onChange={handleRangeChange}></RangeSlider>
            <DepthHistogram lineSegments={lineSegments} onBinSelect={handleBinSelect}/>
            <TrajectoryWindow 
              toolpath={currentToolpath}
              lineSegments={lineSegments}
              filterSegmentIds={filterSegmentIds}
              min={minValue}
              max={maxValue}/>
        </div>
    );
}

ReactDOM.render(<App></App>, document.getElementById("app"));
