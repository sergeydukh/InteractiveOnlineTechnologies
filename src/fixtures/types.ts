import type { AppApi } from '../api/appApi';
import type { AdminSession } from '../auth/session';
import type { TestActor } from '../test-support/testData';
import type { AppBrowserContextFactory } from '../test-support/appBrowserContextFactory';
import type { AuthRouteStub } from '../test-support/authRouteStub';
import type { AdminPage } from '../ui/pages/adminPage';
import type { DashboardPage } from '../ui/pages/dashboardPage';
import type { LoginPage } from '../ui/pages/loginPage';
import type { ProfilePage } from '../ui/pages/profilePage';
import type { RegisterPage } from '../ui/pages/registerPage';
import type { VacancyApplicationPage } from '../ui/pages/vacancyApplicationPage';

export interface ApiVariants {
  readonly withoutAccessKey: AppApi;
  readonly malformedAccessKey: AppApi;
  readonly withoutAnalyticsBasic: AppApi;
}

export interface ApiFixtures {
  readonly api: AppApi;
  readonly apiVariants: ApiVariants;
  readonly adminCredentials: Readonly<{ email: string; password: string }>;
}

export interface ApiWorkerFixtures {
  readonly workerApi: AppApi;
  readonly adminSession: AdminSession;
}

export interface ActorFixtures {
  readonly resourceActor: TestActor;
  readonly secondaryResourceActor: TestActor;
  readonly analyticsActor: TestActor;
  readonly isolatedActor: TestActor;
}

export interface ActorWorkerFixtures {
  readonly sharedResourceActor: TestActor;
  readonly sharedSecondaryResourceActor: TestActor;
  readonly sharedAnalyticsActor: TestActor;
  readonly readOnlyActor: TestActor;
}

export interface BrowserFixtures {
  readonly appContextFactory: AppBrowserContextFactory;
  readonly authRouteStub: AuthRouteStub;
}

export interface PageFixtures {
  readonly loginPage: LoginPage;
  readonly registerPage: RegisterPage;
  readonly vacancyPage: VacancyApplicationPage;
  readonly dashboardPage: DashboardPage;
  readonly profilePage: ProfilePage;
  readonly readOnlyDashboardPage: DashboardPage;
  readonly readOnlyProfilePage: ProfilePage;
  readonly adminPage: AdminPage;
}
