export const ambulanceLoop=Object.freeze({x:22,z:86,halfStraight:62,radius:26,width:9,driveRadius:28,entryX:-10,exitX:86,queueZ:110,travelZ:114,hospitalX:0,hospitalZ:19});
const pt=(x,z)=>({x,z});
export function pathLength(points){let n=0;for(let i=1;i<points.length;i++)n+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);return n;}

// Matching samples form the roadway, kerbs, map and ambulance trajectories.
export function stadiumOutline(radius=ambulanceLoop.radius,segments=64){
 const {x,z,halfStraight}=ambulanceLoop,right=x+halfStraight,left=x-halfStraight,points=[pt(right,z-radius)];
 for(let i=1;i<=segments;i++){const a=-Math.PI/2+i*Math.PI/segments;points.push(pt(right+Math.cos(a)*radius,z+Math.sin(a)*radius));}
 for(let i=1;i<=segments;i++)points.push(pt(right+(left-right)*i/segments,z+radius));
 for(let i=1;i<=segments;i++){const a=Math.PI/2+i*Math.PI/segments;points.push(pt(left+Math.cos(a)*radius,z+Math.sin(a)*radius));}
 for(let i=1;i<=segments;i++)points.push(pt(left+(right-left)*i/segments,z-radius));return points;
}
function quadratic(a,b,c,segments=18){return Array.from({length:segments+1},(_,i)=>{const t=i/segments,u=1-t;return pt(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.z+2*u*t*b.z+t*t*c.z);});}
function cubic(a,b,c,d,segments=24){return Array.from({length:segments+1},(_,i)=>{const t=i/segments,u=1-t;return pt(u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,u*u*u*a.z+3*u*u*t*b.z+3*u*t*t*c.z+t*t*t*d.z);});}
function rightBend(radius){const {x,z,halfStraight,exitX}=ambulanceLoop,right=x+halfStraight,endAngle=-Math.acos((exitX+7-right)/radius),points=[];for(let i=0;i<=64;i++){const a=Math.PI/2+(endAngle-Math.PI/2)*i/64;points.push(pt(right+Math.cos(a)*radius,z+Math.sin(a)*radius));}return [...points,...quadratic(points.at(-1),pt(exitX,z-radius),pt(exitX,51)).slice(1)];}
export function ambulanceStaging(index){return pt(56-index*12,ambulanceLoop.queueZ);}
export function ambulanceDispatch(staging,park){
 const {travelZ,exitX,x,halfStraight}=ambulanceLoop;
 const merge=cubic(staging,pt(staging.x+4,staging.z),pt(staging.x+4,travelZ),pt(staging.x+8,travelZ));
 const bend=rightBend(ambulanceLoop.driveRadius),finish=smoothRoad([bend.at(-1),[exitX,park.z],park],4);
 return [...merge,pt(x+halfStraight,travelZ),...bend.slice(1),...finish.slice(1)];
}

// Follow the annotated return direction: west from the hospital, around the
// left bend, east along the far side, then out beside triage on the right.
export function lapPoints(radius=ambulanceLoop.driveRadius){
 const {x,z,halfStraight,entryX,exitX}=ambulanceLoop,left=x-halfStraight,right=x+halfStraight,top=z-radius;
 const points=quadratic(pt(entryX,51),pt(entryX,top),pt(entryX-7,top));
 points.push(pt(left,top));
 for(let i=1;i<=64;i++){const a=-Math.PI/2-i*Math.PI/64;points.push(pt(left+Math.cos(a)*radius,z+Math.sin(a)*radius));}
 points.push(pt(right,z+radius));
 const endAngle=-Math.acos((exitX+7-right)/radius);
 for(let i=1;i<=64;i++){const a=Math.PI/2+(endAngle-Math.PI/2)*i/64;points.push(pt(right+Math.cos(a)*radius,z+Math.sin(a)*radius));}
 points.push(...quadratic(points.at(-1),pt(exitX,top),pt(exitX,51)).slice(1));
 return points;
}

export function smoothRoad(values,radius=3){
 const points=values.map(p=>Array.isArray(p)?pt(...p):pt(p.x,p.z)),out=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],l1=Math.hypot(b.x-a.x,b.z-a.z),l2=Math.hypot(c.x-b.x,c.z-b.z);if(l1<.001||l2<.001)continue;
  const cut=Math.min(radius,l1*.35,l2*.35),start=pt(b.x-(b.x-a.x)/l1*cut,b.z-(b.z-a.z)/l1*cut),end=pt(b.x+(c.x-b.x)/l2*cut,b.z+(c.z-b.z)/l2*cut);out.push(start);
  for(let j=1;j<=10;j++){const t=j/10,u=1-t;out.push(pt(u*u*start.x+2*u*t*b.x+t*t*end.x,u*u*start.z+2*u*t*b.z+t*t*end.z));}
 }
 out.push(points.at(-1));return out;
}
export function ambulanceJourney(park,bay){
 return {points:smoothRoad([park,[70,park.z],[66,36],[9,36],[9,19],[0,19]],4)};
}
export function ambulanceReturn(bay,staging){
 const {entryX,z,driveRadius:r,x,halfStraight,travelZ}=ambulanceLoop,left=x-halfStraight;
 const approach=smoothRoad([[0,19],[entryX,19],[entryX,51]],4),lap=quadratic(pt(entryX,51),pt(entryX,z-r),pt(entryX-7,z-r));
 lap.push(pt(left,z-r));for(let i=1;i<=64;i++){const a=-Math.PI/2-i*Math.PI/64;lap.push(pt(left+Math.cos(a)*r,z+Math.sin(a)*r));}
 const merge=cubic(pt(staging.x-8,travelZ),pt(staging.x-4,travelZ),pt(staging.x-4,staging.z),staging);
 lap.push(...merge);
 return {points:[...approach,...lap.slice(1)],loopStartDistance:pathLength(approach),loopEndDistance:pathLength(approach)+pathLength(lap),lapLength:pathLength(lap),lap};
}
