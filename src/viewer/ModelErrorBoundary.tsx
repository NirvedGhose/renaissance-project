import {Component,type ErrorInfo,type ReactNode} from 'react'
type Props={fallback:ReactNode;onError:(error:Error)=>void;children:ReactNode}
type State={failed:boolean}
export class ModelErrorBoundary extends Component<Props,State>{state:State={failed:false};static getDerivedStateFromError():State{return{failed:true}}componentDidCatch(error:Error,_info:ErrorInfo){this.props.onError(error)}render(){return this.state.failed?this.props.fallback:this.props.children}}
