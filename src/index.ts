import {HyperValue, scopes} from 'hv';
import {Component, Children, jsx} from 'hv-jsx';
import {RouterCore as BaseRouter, Route, RouteView, route as baseRoute, RouteData, Data, RouterConfig, handleHistory} from 'router-core';

export type RouteComponentProps = {routeData: HyperValue<Data<string>>, routeName: string};

export type RouteComponentClass = new (props: RouteComponentProps, children: Children) => Component<RouteComponentProps>;

export interface Meta {
    component: RouteComponentClass;
}

export function route(pattern: any, config: RouteData<string> & Meta): Route<string, Meta> {
    const route = baseRoute<Meta>(pattern, config);
    route.meta.component = config.component;
    return route;
}

export class Router<R extends RouterConfig<Meta>> extends BaseRouter<Meta, R> {
    hs = new scopes.ObjectScope();
    routeData: HyperValue<Data<string>>;
    routeName: HyperValue<string>;
    cvhv: HyperValue<RouteView<string, Meta>>;
    content: HyperValue<Children>;
    inTransition: boolean;

    private renderRoot(routeName: string, routeData: HyperValue<Data<string>>) {
        return jsx(this.routes[routeName].meta.component as any, {routeName, routeData});
    }

    constructor(routes: R) {
        super(routes);

        handleHistory(this);

        this.onTransition((type, oldCW, newCW, handleHistory) => {
            this.inTransition = true;

            switch (type) {
                case 'routeChange':
                    this.routeName.$ = newCW.routeName;
                    this.routeData.$ = newCW.data;
                    break;
                case 'pathChange':
                case 'paramChange':
                    this.routeData.$ = newCW.data;
            }

            this.inTransition = false;
        });
    }

    init<N extends keyof R, P extends string>(route: Route<P, Meta> | N, data: Data<P>) {
        super.init(route, data);
        this.cvhv = new HyperValue(this.currentView);
        this.routeName = this.hs.prop(this.cvhv, 'routeName');
        this.routeData = this.hs.prop(this.cvhv, 'data');
        this.hs.watch(this.cvhv, newCV => {
            if (!this.inTransition) {
                this.go(newCV.routeName, newCV.data);
            }
        });
        this.content = this.hs.auto(() => this.renderRoot(this.routeName.$, this.routeData));
        history.replaceState(this.currentView.state, '', location.href);
    }

}

