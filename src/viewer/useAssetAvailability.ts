import {useEffect,useMemo,useState} from 'react'
import {assetById,assetRuntimeUrl,checkRuntimeAsset,type AssetAvailability,type ManifestAssetId} from './manifest'
export function useAssetAvailability(ids:ManifestAssetId[]){
 const key=useMemo(()=>[...new Set(ids)].sort().join('|'),[ids]);const unique=useMemo(()=>key?key.split('|') as ManifestAssetId[]:[],[key]);const [states,setStates]=useState<Record<string,AssetAvailability>>({})
 useEffect(()=>{const controller=new AbortController();setStates(Object.fromEntries(unique.map(id=>[id,'checking'])));void Promise.all(unique.map(async id=>[id,await checkRuntimeAsset(id,controller.signal)] as const)).then(results=>setStates(Object.fromEntries(results))).catch(()=>{});return()=>controller.abort()},[unique])
 const pending=unique.filter(id=>states[id]==='checking').length;const missing=unique.filter(id=>states[id]==='missing');const errors=unique.filter(id=>states[id]==='error');return {states,pending,missing,errors,urls:Object.fromEntries(unique.map(id=>[id,assetRuntimeUrl(id)])),assets:Object.fromEntries(unique.map(id=>[id,assetById(id)]))}
}
