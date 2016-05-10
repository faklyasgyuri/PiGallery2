import {it, inject, beforeEachProviders} from "@angular/core/testing";
import {BaseRequestOptions, Http} from "@angular/http";
import {MockBackend} from "@angular/http/testing";
import {provide} from "@angular/core";
import "rxjs/Rx";
import {NetworkService} from "../model/network/network.service";
import {AdminService} from "./admin.service";


describe('AdminService', () => {


    beforeEachProviders(() => [
        MockBackend,
        BaseRequestOptions,
        provide(Http, {
            useFactory: (backend, options) => {
                return new Http(backend, options);
            }, deps: [MockBackend, BaseRequestOptions]
        }),
        NetworkService,
        AdminService
    ]);


    it('placeholder test', inject([], () => {
        expect(true).toBe(true);
    }));

});
