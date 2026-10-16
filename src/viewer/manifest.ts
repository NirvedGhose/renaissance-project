import manifest from '../../asset_manifest.json'

export type ManifestAsset=typeof manifest.assets[number]
export type ManifestAssetId=ManifestAsset['id']
export const ASSET_MANIFEST=manifest
export const assetById=(id:ManifestAssetId):ManifestAsset=>{
  const asset=manifest.assets.find(item=>item.id===id)
  if(!asset) throw new Error(`Asset ${id} is missing from asset_manifest.json`)
  return asset
}
export function assetRuntimeUrl(id:ManifestAssetId,baseUrl=import.meta.env.BASE_URL):string{
  const base=baseUrl.endsWith('/')?baseUrl:`${baseUrl}/`
  return new URL(`${base}assets/glb/${assetById(id).file}`,window.location.href).toString()
}
export type AssetAvailability='checking'|'available'|'missing'|'error'
export async function checkRuntimeAsset(id:ManifestAssetId,signal?:AbortSignal):Promise<AssetAvailability>{
  try{
    const response=await fetch(assetRuntimeUrl(id),{method:'HEAD',cache:'no-store',signal})
    if(!response.ok) return 'missing'
    const type=response.headers.get('content-type')?.toLowerCase()??''
    const length=Number(response.headers.get('content-length')??0)
    if(type.includes('text/html')||length>0&&length<12) return 'missing'
    return 'available'
  }catch(error){if(error instanceof DOMException&&error.name==='AbortError')throw error;return 'error'}
}
