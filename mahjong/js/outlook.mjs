import {tileName} from './engine.mjs?v=win-source-1';

function counts(tiles){
 const result={};
 for(const tile of tiles)result[tile.k]=(result[tile.k]||0)+1;
 return result;
}

function snapshot(game,row){
 const exposed=game.exposed.map(groups=>groups.flatMap(group=>group.tiles));
 return {key:row.target.key,away:row.away,blocked:row.blocked,tight:row.tight,
  jokerDebt:row.jokerDebt,naturals:row.naturalsNeeded,copies:row.usefulCopies,helpful:row.helpful,
  held:counts([...game.hands[0],...exposed[0]]),exposed:counts(exposed.slice(1).flat()),
  discarded:counts(game.discards.filter(d=>!d.claimed).map(d=>d.tile))};
}

function changeNote(before,now,row,direction){
 if(row.incompatible)return 'Your exposure no longer fits this line.';
 if(before.blocked&&!now.blocked)return 'Your tiles have reopened this line.';
 const relevant=Object.keys({...before.helpful,...now.helpful});
 const cause=(source,keys,sign)=>keys.find(k=>sign*((now[source][k]||0)-(before[source][k]||0))>0);
 if(before.away!==now.away){
  const tile=cause('held',Object.keys(direction>0?before.helpful:now.helpful),direction);
  if(tile)return direction>0?'That '+tileName(tile)+' brings you closer.':'Letting the '+tileName(tile)+' go cost this line a little ground.';
  return direction>0?'More of your tiles now fit this line.':'Fewer of your tiles now fit this line.';
 }
 const fewer=relevant.filter(k=>k in now.helpful&&now.helpful[k]<before.helpful[k]);
 const key=direction<0&&(cause('exposed',fewer,1)??cause('discarded',fewer,1));
 if(key){
  const exposure=(now.exposed[key]||0)>(before.exposed[key]||0);
  return (exposure?'An opponent exposed '+tileName(key)+'.':'There’s a '+tileName(key)+' in the discards.')+' '+(row.blocked?'Too few natural copies are left for this pattern.':'That leaves fewer copies to find.');
 }
 if(before.key!==now.key)return 'A different variation now fits your rack.';
 if(now.jokerDebt>before.jokerDebt)return 'Completing the sets now requires another joker.';
 return direction>0?'Your remaining tiles are easier to find.':'Your remaining tiles are harder to find.';
}

// Only committed rack changes and public evidence create history entries.
// Numbers stay comparable across suit variations of the same card line.
export function trackOutlook(previous,game,row){
 const now=snapshot(game,row);
 if(previous?.line!==row.target.id){
  return {line:row.target.id,start:row.incompatible?null:now.away,last:now,status:now.blocked?'Blocked':'Tracking',note:'',history:[]};
 }
 const old=previous.last;
 const difference=Number(old.blocked)-Number(now.blocked)||old.away-now.away||old.jokerDebt-now.jokerDebt||
  old.tight-now.tight||old.naturals-now.naturals||now.copies-old.copies;
 if(!difference){
  const firstMove=previous.status==='Tracking'&&['held','exposed','discarded'].some(source=>
   Object.keys({...old[source],...now[source]}).some(k=>old[source][k]!==now[source][k]));
  return {...previous,last:now,status:firstMove?'Steady':previous.status};
 }
 const status=now.blocked?'Blocked':difference>0?'Improving':'Weakening';
 const note=changeNote(old,now,row,Math.sign(difference));
 const entry={status,note,away:row.incompatible?null:now.away};
 return {...previous,last:now,status,note,history:[entry,...previous.history].slice(0,5)};
}

export function pivotReason(focus,other){
 if(!other||other.blocked||focus.away===0)return '';
 const a=focus.target.name,b=other.target.name;
 if(focus.incompatible)return 'Your exposure rules out '+a+'. '+b+' fits it.';
 const dead=focus.gaps.find(g=>g.blocked);
 if(dead)return a+' needs more natural copies of '+tileName(dead.key)+' than remain unseen. '+b+' is still open.';
 if(other.away>focus.away||other.jokerDebt>focus.jokerDebt||other.tight>focus.tight)return '';
 if(other.away+2<=focus.away&&other.naturalsNeeded<=focus.naturalsNeeded)return 'I’d give '+b+' a look. You’re much closer to it than '+a+'.';
 if(other.jokerDebt<focus.jokerDebt)return a+' relies on more jokers to finish its sets. '+b+' has more natural tiles available.';
 if(other.tight<focus.tight&&other.naturalsNeeded<=focus.naturalsNeeded){
  const gap=focus.gaps.find(g=>g.need===g.unseen);
  return a+' needs every unseen copy of '+tileName(gap.key)+'. '+b+' leaves more room to draw what you need.';
 }
 if(focus.scarceKey&&other.naturalsNeeded<=focus.naturalsNeeded&&
  other.usefulCopies>=focus.usefulCopies*1.5&&other.usefulCopies>=focus.usefulCopies+4){
  return 'Visible '+tileName(focus.scarceKey)+' tiles narrow the draws for '+a+'. More unseen tiles can advance '+b+'.';
 }
 return '';
}
