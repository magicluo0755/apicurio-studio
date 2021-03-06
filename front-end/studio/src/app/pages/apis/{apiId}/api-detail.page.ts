/**
 * @license
 * Copyright 2017 JBoss Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Component, Inject} from "@angular/core";
import {ActivatedRoute, Router} from "@angular/router";

import {ApisService} from "../../../services/apis.service";
import {Api} from "../../../models/api.model";
import {ApiContributors} from "../../../models/api-contributors.model";
import {AbstractPageComponent} from "../../../components/page-base.component";
import {ApiDesignChange} from "../../../models/api-design-change.model";
import {Title} from "@angular/platform-browser";
import {IAuthenticationService} from "../../../services/auth.service";
import {User} from "../../../models/user.model";
import {ApiCollaborator} from "../../../models/api-collaborator.model";

@Component({
    moduleId: module.id,
    selector: "api-detail-page",
    templateUrl: "api-detail.page.html",
    styleUrls: ["api-detail.page.css"]
})
export class ApiDetailPageComponent extends AbstractPageComponent {

    public api: Api;
    public contributors: ApiContributors;
    public collaborators: ApiCollaborator[];
    public activity: ApiDesignChange[] = [];
    public activityStart: number = 0;
    public activityEnd: number = 10;
    public hasMoreActivity: boolean = false;
    public gettingMoreActivity: boolean = false;
    public canDelete: boolean = false;

    /**
     * Constructor.
     * @param router
     * @param route
     * @param apis
     * @param titleService
     * @param authService
     */
    constructor(private router: Router, route: ActivatedRoute,
                private apis: ApisService, titleService: Title,
                private authService: IAuthenticationService) {
        super(route, titleService);
        this.api = new Api();
    }

    /**
     * The page title.
     */
    protected pageTitle(): string {
        if (this.api.name) {
            return "Apicurio Studio - API :: " + this.api.name;
        } else {
            return "Apicurio Studio - API Details";
        }
    }

    /**
     * Name of the API for display purposes.
     */
    public displayName(): string {
        if (this.api.name && this.api.name.length > 50) {
            return this.api.name.substring(0, 50) + "...";
        }
        return this.api.name;
    }

    /**
     * Called to kick off loading the page's async data.
     * @param params
     */
    public loadAsyncPageData(params: any): void {
        console.info("[ApiDetailPageComponent] Loading async page data");
        let apiId: string = params["apiId"];
        this.apis.getApi(apiId).then(api => {
            this.api = api;
            this.dataLoaded["api"] = true;
            this.updatePageTitle();

            // Note: this is a shortcut to make an initial guess/determination as to whether the
            // user is allowed to delete the API.  The real check will happen when the list of
            // collaborators comes back and we check that list against the authenticated user.  But
            // this is quicker and a decent guess.
            let user: User = this.authService.getAuthenticatedUserNow();
            this.canDelete = api.createdBy === user.login;
        }).catch(error => {
            console.error("[ApiDetailPageComponent] Error getting API");
            this.error(error);
        });
        this.apis.getContributors(apiId).then(contributors => {
            console.info("[ApiDetailPageComponent] Contributors data loaded: %o", contributors);
            this.contributors = contributors;
            this.dataLoaded["contributors"] = true;
        }).catch(error => {
            console.error("[ApiDetailPageComponent] Error getting API contributors");
            this.error(error);
        });
        this.apis.getActivity(apiId, this.activityStart, this.activityEnd).then(activity => {
            console.info("[ApiDetailPageComponent] Activity data loaded");
            this.activity = activity;
            this.dataLoaded["activity"] = true;
            this.hasMoreActivity = activity && activity.length >= 10;
        }).catch(error => {
            console.error("[ApiDetailPageComponent] Error getting API activity");
            this.error(error);
        });
        this.apis.getCollaborators(apiId).then( collaborators => {
            this.collaborators = collaborators;
            this.dataLoaded["collaborators"] = true;

            // Now for the true test of whether the logged-in user can delete the API.
            let user: User = this.authService.getAuthenticatedUserNow();
            collaborators.forEach( collaborator => {
                if (collaborator.userId === user.login) {
                    this.canDelete = collaborator.role === "owner";
                }
            });
        });
    }

    /**
     * Called to delete the API from the studio (unmanage it).
     */
    public deleteApi(): void {
        // TODO need a visual indicator that we're working on the delete
        this.apis.deleteApi(this.api).then(() => {
            this.router.navigate([ "" ]);
        }).catch( reason => {
            this.error(reason);
        });
    }

    /**
     * Called when the user clicks on a Tag in the API details page.
     * @param tag
     */
    public selectTag(tag: string): void {
        // TODO do something when the user clicks a tag?
    }

    /**
     * Called when the user wishes to see more activity.
     */
    public showMoreActivity(): void {
        this.activityStart += 10;
        this.activityEnd += 10;

        this.apis.getActivity(this.api.id, this.activityStart, this.activityEnd).then(activity => {
            this.activity = this.activity.concat(activity);
            this.hasMoreActivity = activity && activity.length >= 10;
        }).catch(error => {
            console.error("[ApiDetailPageComponent] Error getting API activity");
            this.error(error);
        });
    }

}
