import ical, { ICalCalendarMethod } from 'ical-generator';
import type { ProviderFixture, ProviderBroadcast } from '../providers/types';

export function buildScoutingCalendar(input:{ownerName:string;fixtures:Array<ProviderFixture & {watchedPlayers:string[]}>}){
  const calendar=ical({name:`Scoutboard — ${input.ownerName}`,method:ICalCalendarMethod.PUBLISH});
  for(const fixture of input.fixtures){
    const start=new Date(fixture.startTime); const end=new Date(start.getTime()+120*60*1000);
    const broadcast=fixture.broadcasts?.[0] as ProviderBroadcast|undefined;
    const playerLine=fixture.watchedPlayers.length?`Watch: ${fixture.watchedPlayers.join(', ')}`:'Scouting match';
    calendar.createEvent({start,end,summary:`${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,description:[playerLine,fixture.competition,fixture.venue,broadcast?`Watch on ${broadcast.station}`:null].filter(Boolean).join('\n'),location:fixture.venue??undefined,url:broadcast?.url??undefined});
  }
  return calendar.toString();
}
