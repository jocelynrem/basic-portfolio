import {newGame} from './engine.mjs?v=hand-outlook-1';

// Practice has its own hand and points; the normal table is kept by the caller.
export function practiceGame(previous,difficulty=previous.difficulty){
 const dealer=previous.practiceSession?((previous.dealer||0)+1)%4:(previous.dealer||0);
 const game=newGame('guided',{dealer,difficulty,handNumber:previous.practiceSession?(previous.handNumber||1)+1:1,scores:previous.practiceSession?[...previous.scores]:[0,0,0,0],scoreHistory:previous.practiceSession?[...previous.scoreHistory]:[]});
 return {...game,practiceSession:true,freePracticeChoice:true};
}

// Older practice deals pinned this exact variation before the first pass.
export function restorePracticeChoice(game){
 if(!game.practiceSession||game.freePracticeChoice)return;
 const opening=game.phase==='wallSetup'||(game.phase==='charleston'&&game.passRound===1&&game.passStep===0);
 if(opening&&game.goalTargetKey==='even2-0'){
  game.goalHandId=null;
  game.goalTargetKey=null;
 }
 game.freePracticeChoice=true;
}
