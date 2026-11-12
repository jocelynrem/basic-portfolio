import {newGame,TARGETS} from './engine.mjs?v=wind-sort-1';

// Practice has its own hand and points; the normal table is kept by the caller.
export function practiceGame(previous,difficulty=previous.difficulty){
 const dealer=previous.practiceSession?((previous.dealer||0)+1)%4:(previous.dealer||0);
 const game=newGame('guided',{dealer,difficulty,handNumber:previous.practiceSession?(previous.handNumber||1)+1:1,scores:previous.practiceSession?[...previous.scores]:[0,0,0,0],scoreHistory:previous.practiceSession?[...previous.scoreHistory]:[]});
 const target=TARGETS.find(t=>t.id==='even2'&&t.groups.some(([k,n])=>k==='B2'&&n===4)&&t.groups.some(([k,n])=>k==='C4'&&n===2));
 return {...game,practiceSession:true,goalHandId:target.id,goalTargetKey:target.key};
}
