import Footer from "@/components/footer";
import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import { ArrowUpRight, Gamepad2, BarChart3, Users, Shield } from "lucide-react";
import { createClient } from "../../supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users to dashboard
  if (user) {
    return redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <Hero />

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Track Your Game Sessions
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The ultimate tool for board game enthusiasts to log sessions,
              track performance, and analyze gameplay with friends.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Gamepad2 className="w-6 h-6" />,
                title: "Session Logging",
                description:
                  "Quick mobile-friendly forms to record game sessions",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Performance Stats",
                description: "Win rates, role analysis, and detailed insights",
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Group Management",
                description:
                  "Create private groups with shareable invite links",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Secure & Private",
                description:
                  "Row-level security ensures your data stays private",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-blue-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-blue-100">Games Tracked</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-100">Active Groups</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">Always Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Track Your Games?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join game groups and start logging your board game sessions today.
            It's free to get started!
          </p>
          <a
            href="/sign-up"
            className="inline-flex items-center px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started Free
            <ArrowUpRight className="ml-2 w-4 h-4" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
